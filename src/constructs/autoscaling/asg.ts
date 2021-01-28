import type { AutoScalingGroupProps, CfnAutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import { AutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import type { ISecurityGroup, MachineImage, MachineImageConfig } from "@aws-cdk/aws-ec2";
import { InstanceType, OperatingSystemType, UserData } from "@aws-cdk/aws-ec2";
import type { ApplicationTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";
import type { GuStack } from "../core";
import { GuAmiParameter, GuInstanceTypeParameter } from "../core";

// Since we want to override the types of what gets passed in for the below props,
// we need to use Omit<T, U> to remove them from the interface this extends
// https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys
export interface GuAutoScalingGroupProps
  extends Omit<AutoScalingGroupProps, "imageId" | "osType" | "machineImage" | "instanceType" | "userData"> {
  instanceType?: InstanceType;
  osType?: OperatingSystemType;
  machineImage?: MachineImage;
  userData: string;
  securityGroups?: ISecurityGroup[];
  targetGroup?: ApplicationTargetGroup;
  overrideId?: boolean;
}

export class GuAutoScalingGroup extends AutoScalingGroup {
  constructor(scope: GuStack, id: string, props: GuAutoScalingGroupProps) {
    const imageId = new GuAmiParameter(scope, "AMI", {
      description: "AMI ID",
    });

    // We need to override getImage() so that we can pass in the AMI as a parameter
    // Otherwise, MachineImage.lookup({ name: 'some str' }) would work as long
    // as the name is hard-coded
    function getImage(): MachineImageConfig {
      return {
        osType: props.osType ?? OperatingSystemType.LINUX,
        userData: UserData.custom(props.userData),
        imageId: imageId.valueAsString,
      };
    }

    const mergedProps = {
      ...props,
      machineImage: { getImage: getImage },
      instanceType: props.instanceType ?? new InstanceType(new GuInstanceTypeParameter(scope).valueAsString),
      userData: UserData.custom(props.userData),
    };

    super(scope, id, mergedProps);

    mergedProps.targetGroup && this.attachToApplicationTargetGroup(mergedProps.targetGroup);

    mergedProps.securityGroups?.forEach((sg) => this.addSecurityGroup(sg));

    const cfnAsg = this.node.defaultChild as CfnAutoScalingGroup;
    // A CDK AutoScalingGroup comes with this update policy, whereas the CFN autscaling group
    // leaves it to the default value, which is actually false.
    // { UpdatePolicy: { autoScalingScheduledAction: { IgnoreUnmodifiedGroupSizeProperties: true }}
    cfnAsg.addDeletionOverride("UpdatePolicy");

    if (mergedProps.overrideId) cfnAsg.overrideLogicalId(id);
  }
}
