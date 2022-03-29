import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import type { AutoScalingGroupProps, CfnAutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { OperatingSystemType, UserData } from "aws-cdk-lib/aws-ec2";
import type { ISecurityGroup, MachineImageConfig } from "aws-cdk-lib/aws-ec2";
import type { ApplicationTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Token } from "aws-cdk-lib";
import type { GuAsgCapacity } from "../../types/asg";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import { GuAmiParameter } from "../core";
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
      | "requireImdsv2"
      | "securityGroup"
    >,
    AppIdentity,
    GuMigratingResource,
    GuAsgCapacity {
  imageId?: GuAmiParameter;
  userData: UserData | string;
  additionalSecurityGroups?: ISecurityGroup[];
  targetGroup?: ApplicationTargetGroup;
  withoutImdsv2?: boolean;
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
 *
 * All EC2 instances provisioned via this construct will use
 * [IMDSv2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html).
 */
export class GuAutoScalingGroup extends GuStatefulMigratableConstruct(GuAppAwareConstruct(AutoScalingGroup)) {
  constructor(scope: GuStack, id: string, props: GuAutoScalingGroupProps) {
    const {
      app,
      additionalSecurityGroups = [],
      imageId = new GuAmiParameter(scope, { app }),
      minimumInstances,
      maximumInstances,
      role = new GuInstanceRole(scope, { app }),
      targetGroup,
      userData: userDataLike,
      vpc,
      withoutImdsv2 = false,
    } = props;

    // Ensure min and max are defined in the same way. Throwing an `Error` when necessary. For example when min is defined via a Mapping, but max is not.
    if (Token.isUnresolved(minimumInstances) && !Token.isUnresolved(maximumInstances)) {
      throw new Error(
        "minimumInstances is defined via a Mapping, but maximumInstances is not. Create maximumInstances via a Mapping too."
      );
    }

    const userData = userDataLike instanceof UserData ? userDataLike : UserData.custom(userDataLike);

    const mergedProps: AutoScalingGroupProps = {
      ...props,
      minCapacity: minimumInstances,
      maxCapacity: maximumInstances ?? minimumInstances * 2,
      role,
      requireImdsv2: !withoutImdsv2,
      machineImage: {
        getImage: (): MachineImageConfig => {
          return {
            osType: OperatingSystemType.LINUX,
            userData,
            imageId: imageId.valueAsString,
          };
        },
      },
      userData,
      // Do not use the default AWS security group which allows egress on any port.
      // Favour HTTPS only egress rules by default.
      securityGroup: GuHttpsEgressSecurityGroup.forVpc(scope, { app, vpc }),
    };

    super(scope, id, mergedProps);

    targetGroup && this.attachToApplicationTargetGroup(targetGroup);

    [GuWazuhAccess.getInstance(scope, vpc), ...additionalSecurityGroups].forEach((sg) => this.addSecurityGroup(sg));

    const cfnAsg = this.node.defaultChild as CfnAutoScalingGroup;
    // A CDK AutoScalingGroup comes with this update policy, whereas the CFN autscaling group
    // leaves it to the default value, which is actually false.
    // { UpdatePolicy: { autoScalingScheduledAction: { IgnoreUnmodifiedGroupSizeProperties: true }}
    cfnAsg.addDeletionOverride("UpdatePolicy");
  }
}
