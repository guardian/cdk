import type { Duration } from "aws-cdk-lib";
import { Tags, Token } from "aws-cdk-lib";
import { AutoScalingGroup, GroupMetrics } from "aws-cdk-lib/aws-autoscaling";
import type { AutoScalingGroupProps, CfnAutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { LaunchTemplate, OperatingSystemType } from "aws-cdk-lib/aws-ec2";
import type { InstanceType, ISecurityGroup, MachineImageConfig, UserData } from "aws-cdk-lib/aws-ec2";
import type { ApplicationTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { GuAsgCapacity } from "../../types";
import type { AmigoProps } from "../../types/amigo";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import { GuAmiParameter } from "../core";
import type { AppIdentity, GuStack } from "../core";
import { GuHttpsEgressSecurityGroup } from "../ec2";
import { GuInstanceRole } from "../iam";

export type InstanceMetricGranularity = "1Minute" | "5Minute";

// Since we want to override the types of what gets passed in for the below props,
// we need to use Omit<T, U> to remove them from the interface this extends
// https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys
// TODO avoid prop nesting to improve discoverability. See https://github.com/aws/aws-cdk/blob/main/docs/DESIGN_GUIDELINES.md#flat.
export interface GuAutoScalingGroupProps
  extends Omit<
      AutoScalingGroupProps,
      | "imageId"
      | "osType"
      | "machineImage"
      | "userData"
      | "minCapacity"
      | "maxCapacity"
      | "desiredCapacity"
      | "requireImdsv2"
      | "securityGroup"
    >,
    AppIdentity,
    GuAsgCapacity {
  /**
   * @deprecated
   * It shouldn't be necessary to specify a value here.
   * GuCDK will create an AMI parameter by default. Riff-Raff can use this parameter to inject the latest AMI ID for
   * your AMIgo recipe.
   */
  imageId?: GuAmiParameter;
  /**
   * If you are using GuCDK to generate your riff-raff.yaml file, specify AMIgo props here.
   * If you are using a hardcoded riff-raff.yaml file (usually found in project root) then providing a value here has no
   * effect.
   */
  imageRecipe?: string | AmigoProps;
  instanceType: InstanceType;
  userData: UserData;

  /**
   * How often to send EC2 metrics, such as CPU usage.
   * By default, AWS will produce `5Minute` granular metrics.
   *
   * It is recommended to produce `1Minute` granular metrics in production,
   * especially when using ASG metrics to trigger horizontal scaling as it allows for earlier scaling.
   *
   * @see https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
   */
  instanceMetricGranularity: InstanceMetricGranularity;

  additionalSecurityGroups?: ISecurityGroup[];
  targetGroup?: ApplicationTargetGroup;
  httpPutResponseHopLimit?: number;
  defaultInstanceWarmup?: Duration;
}

/**
 * Construct which creates an Auto Scaling group.
 *
 * By default, all EC2 instances in this group will use [[`GuInstanceRole`]],
 * which provides common permissions (e.g. the ability to download an artifact and write logs to the account's logging Kinesis stream).
 *
 * If additional IAM permissions are required, a custom role can be provided via the `role` prop.
 * You may wish to instantiate [[`GuInstanceRole`]] yourself as a basis for this custom role, as it allows custom permissions
 * to be passed in.
 *
 * All EC2 instances in this group will be automatically associated with the [[`GuHttpsEgressSecurityGroup`]] security groups,
 * which allows outbound traffic over HTTPS.
 *
 * If additional ingress or egress rules are required, define custom security groups and pass them in via the
 * `additionalSecurityGroups` prop.
 *
 * All EC2 instances provisioned via this construct will use
 * [IMDSv2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html).
 */
export class GuAutoScalingGroup extends GuAppAwareConstruct(AutoScalingGroup) {
  public readonly app: string;
  public readonly amiParameter: GuAmiParameter;
  public readonly imageRecipe?: string | AmigoProps;

  // Sadly this cannot be named `launchTemplate` as it would clash with a private property on the `AutoScalingGroup` class
  public readonly instanceLaunchTemplate: LaunchTemplate;

  constructor(scope: GuStack, id: string, props: GuAutoScalingGroupProps) {
    const {
      app,
      additionalSecurityGroups = [],
      blockDevices,
      imageId = new GuAmiParameter(scope, { app }),
      imageRecipe,
      instanceType,
      groupMetrics = [GroupMetrics.all()],
      minimumInstances,
      maximumInstances,
      role = new GuInstanceRole(scope, { app }),
      targetGroup,
      userData,
      vpc,
      httpPutResponseHopLimit,
      updatePolicy,
      defaultInstanceWarmup,
      instanceMetricGranularity,
    } = props;

    // Ensure min and max are defined in the same way. Throwing an `Error` when necessary. For example when min is defined via a Mapping, but max is not.
    if (Token.isUnresolved(minimumInstances) && !Token.isUnresolved(maximumInstances)) {
      throw new Error(
        "minimumInstances is defined via a Mapping, but maximumInstances is not. Create maximumInstances via a Mapping too.",
      );
    }

    const detailedMonitoring = instanceMetricGranularity === "1Minute";

    // Generate an ID unique to this app
    const launchTemplateId = `${scope.stack}-${scope.stage}-${app}`;
    const launchTemplate = new LaunchTemplate(scope, launchTemplateId, {
      blockDevices,
      detailedMonitoring,
      instanceType,
      machineImage: {
        getImage: (): MachineImageConfig => {
          return {
            osType: OperatingSystemType.LINUX,
            userData,
            imageId: imageId.valueAsString,
          };
        },
      },
      // Do not use the default AWS security group which allows egress on any port.
      // Favour HTTPS only egress rules by default.
      securityGroup: GuHttpsEgressSecurityGroup.forVpc(scope, { app, vpc }),

      /*
      Ensure we satisfy FSBP EC2.8 control. If needed, an escape hatch can override this.
      See https://docs.aws.amazon.com/securityhub/latest/userguide/ec2-controls.html#ec2-8.
       */
      requireImdsv2: true,

      instanceMetadataTags: true,
      userData,
      role,
      httpPutResponseHopLimit,
    });

    // Add additional consumer specified Security Groups
    // Note: Launch templates via CDK allow specifying only one SG, so use connections
    // https://github.com/aws/aws-cdk/issues/18712
    additionalSecurityGroups.forEach((sg) => launchTemplate.connections.addSecurityGroup(sg));

    const asgProps: AutoScalingGroupProps = {
      ...props,
      launchTemplate,
      maxCapacity: maximumInstances ?? minimumInstances * 2,
      minCapacity: minimumInstances,
      groupMetrics: groupMetrics,

      // Omit userData, instanceType, blockDevices & role from asgProps
      // As this are specified by the LaunchTemplate and must not be duplicated
      blockDevices: undefined,
      instanceType: undefined,
      role: undefined,
      userData: undefined,
      defaultInstanceWarmup,
    };

    super(scope, id, asgProps);

    this.app = app;
    this.amiParameter = imageId;
    this.imageRecipe = imageRecipe;
    this.instanceLaunchTemplate = launchTemplate;

    if (targetGroup) {
      this.attachToApplicationTargetGroup(targetGroup);
    }

    const cfnAsg = this.node.defaultChild as CfnAutoScalingGroup;

    // A CDK AutoScalingGroup comes with this update policy, whereas the CFN autscaling group
    // leaves it to the default value, which is actually false.
    // { UpdatePolicy: { autoScalingScheduledAction: { IgnoreUnmodifiedGroupSizeProperties: true }}
    if (!updatePolicy) {
      cfnAsg.addDeletionOverride("UpdatePolicy");
    }

    Tags.of(launchTemplate).add("App", app);
  }
}
