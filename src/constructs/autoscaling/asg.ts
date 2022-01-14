import { AutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import type { AutoScalingGroupProps, CfnAutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import { OperatingSystemType, UserData } from "@aws-cdk/aws-ec2";
import type { ISecurityGroup, MachineImage, MachineImageConfig } from "@aws-cdk/aws-ec2";
import type { ApplicationTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Stage, StageForInfrastructure } from "../../constants";
import { StageAwareValue } from "../../types/stage";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import { GuAmiParameter, GuStackForInfrastructure } from "../core";
import type { GuStack } from "../core";
import type { AppIdentity } from "../core/identity";
import type { GuMigratingResource } from "../core/migrating";
import { GuHttpsEgressSecurityGroup, GuWazuhAccess } from "../ec2";
import { GuInstanceRole } from "../iam";

// Since we want to override the types of what gets passed in for the below props,
// we need to use Omit<T, U> to remove them from the interface this extends
// https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys
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
      | "securityGroup"
    >,
    AppIdentity,
    GuMigratingResource {
  stageDependentProps?: GuStageDependentAsgProps;
  imageId?: GuAmiParameter;
  machineImage?: MachineImage;
  userData: UserData | string;
  additionalSecurityGroups?: ISecurityGroup[];
  targetGroup?: ApplicationTargetGroup;
}

export type GuStageDependentAsgProps = StageAwareValue<GuAsgCapacityProps>;

/**
 * `minimumInstances` determines the number of ec2 instances running under normal circumstances
 * (i.e. when there are no deployment or scaling events in progress).
 *
 * `maximumInstances` is optional. If omitted, this will be set to `minimumInstances * 2`.
 * This allows us to support Riff-Raff's autoscaling deployment type by default.
 *
 * The maximum capacity value should only be set if you need to scale beyond the default limit (e.g. due to heavy traffic)
 * or restrict scaling for a specific reason.
 */
export interface GuAsgCapacityProps {
  minimumInstances: number;
  maximumInstances?: number;
}

interface AwsAsgCapacityProps {
  minCapacity: number;
  maxCapacity: number;
}

function wireStageDependentProps(
  stack: GuStack,
  app: string,
  stageDependentProps: GuStageDependentAsgProps
): AwsAsgCapacityProps {
  if (StageAwareValue.isStageForInfrastructureValue(stageDependentProps)) {
    return {
      minCapacity: stageDependentProps.INFRA.minimumInstances,
      maxCapacity: stageDependentProps.INFRA.maximumInstances ?? stageDependentProps.INFRA.minimumInstances * 2,
    };
  }

  return {
    minCapacity: stack.withStageDependentValue({
      app,
      variableName: "minInstances",
      stageValues: {
        [Stage.CODE]: stageDependentProps.CODE.minimumInstances,
        [Stage.PROD]: stageDependentProps.PROD.minimumInstances,
      },
    }),
    maxCapacity: stack.withStageDependentValue({
      app,
      variableName: "maxInstances",
      stageValues: {
        [Stage.CODE]: stageDependentProps.CODE.maximumInstances ?? stageDependentProps.CODE.minimumInstances * 2,
        [Stage.PROD]: stageDependentProps.PROD.maximumInstances ?? stageDependentProps.PROD.minimumInstances * 2,
      },
    }),
  };
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
 * All EC2 instances in this group will be automatically associated with two security groups:
 * 1. [[`GuHttpsEgressSecurityGroup`]], which allows outbound traffic over HTTPS.
 * 2. [[`GuWazuhAccess`]], which allows instances to communicate with Wazuh (for security monitoring).
 *
 * If additional ingress or egress rules are required, define custom security groups and pass them in via the
 * `additionalSecurityGroups` prop.
 */
export class GuAutoScalingGroup extends GuStatefulMigratableConstruct(GuAppAwareConstruct(AutoScalingGroup)) {
  constructor(scope: GuStack, id: string, props: GuAutoScalingGroupProps) {
    const userData = props.userData instanceof UserData ? props.userData : UserData.custom(props.userData);

    // We need to override getImage() so that we can pass in the AMI as a parameter
    // Otherwise, MachineImage.lookup({ name: 'some str' }) would work as long
    // as the name is hard-coded
    function getImage(): MachineImageConfig {
      return {
        osType: OperatingSystemType.LINUX,
        userData,
        imageId: props.imageId?.valueAsString ?? new GuAmiParameter(scope, props).valueAsString,
      };
    }

    const defaultStageDependentProps: GuStageDependentAsgProps = GuStackForInfrastructure.isGuStackForInfrastructure(
      scope
    )
      ? {
          [StageForInfrastructure]: { minimumInstances: 1 },
        }
      : {
          [Stage.CODE]: { minimumInstances: 1 },
          [Stage.PROD]: { minimumInstances: 3 },
        };

    const mergedProps = {
      ...props,
      ...wireStageDependentProps(scope, props.app, props.stageDependentProps ?? defaultStageDependentProps),
      role: props.role ?? new GuInstanceRole(scope, { app: props.app }),
      machineImage: { getImage: getImage },
      userData,
      // Do not use the default AWS security group which allows egress on any port.
      // Favour HTTPS only egress rules by default.
      securityGroup: GuHttpsEgressSecurityGroup.forVpc(scope, { app: props.app, vpc: props.vpc }),
    };

    super(scope, id, mergedProps);

    mergedProps.targetGroup && this.attachToApplicationTargetGroup(mergedProps.targetGroup);

    this.addSecurityGroup(GuWazuhAccess.getInstance(scope, props.vpc));
    mergedProps.additionalSecurityGroups?.forEach((sg) => this.addSecurityGroup(sg));

    const cfnAsg = this.node.defaultChild as CfnAutoScalingGroup;
    // A CDK AutoScalingGroup comes with this update policy, whereas the CFN autscaling group
    // leaves it to the default value, which is actually false.
    // { UpdatePolicy: { autoScalingScheduledAction: { IgnoreUnmodifiedGroupSizeProperties: true }}
    cfnAsg.addDeletionOverride("UpdatePolicy");
  }
}
