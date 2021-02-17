import type { AutoScalingGroupProps, CfnAutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import { AutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import type { ISecurityGroup, MachineImage, MachineImageConfig } from "@aws-cdk/aws-ec2";
import { InstanceType, OperatingSystemType, UserData } from "@aws-cdk/aws-ec2";
import type { ApplicationTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";
import type { GuStack, GuStageDependentNumber } from "../core";
import { GuAmiParameter, GuInstanceTypeParameter } from "../core";

// Since we want to override the types of what gets passed in for the below props,
// we need to use Omit<T, U> to remove them from the interface this extends
// https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys
export interface GuAutoScalingGroupProps
  extends Omit<
    AutoScalingGroupProps,
    | "imageId"
    | "osType"
    | "machineImage"
    | "instanceType"
    | "userData"
    | "minCapacity"
    | "maxCapacity"
    | "desiredCapacity"
  > {
  capacity: GuAsgCapacityProps;
  instanceType?: InstanceType;
  imageId?: GuAmiParameter;
  osType?: OperatingSystemType;
  machineImage?: MachineImage;
  userData: string;
  securityGroups?: ISecurityGroup[];
  targetGroup?: ApplicationTargetGroup;
  overrideId?: boolean;
}

/**
 * `minimumCodeInstances` and `minimumProdInstances` determine the number of ec2 instances running
 * in each stage under normal circumstances (i.e. when there are no deployment or scaling events in progress).
 *
 * `maximumCodeInstances` and `maximumProdInstances` are both optional. If omitted, these
 * will be set to `minimumCodeInstances * 2` and `minimumProdInstances * 2`, respectively.
 * This allows us to support Riff-Raff's autoscaling deployment type by default.
 *
 * The maximum capacity values can be set manually if you need to scale beyond the default limit (e.g. due to heavy traffic)
 * or restrict scaling for a specific reason.
 */
export interface GuAsgCapacityProps {
  minimumCodeInstances: number;
  minimumProdInstances: number;
  maximumCodeInstances?: number;
  maximumProdInstances?: number;
}

interface AwsAsgCapacityProps {
  minCapacity: number;
  maxCapacity: number;
}

function wireCapacityProps(stack: GuStack, capacity: GuAsgCapacityProps): AwsAsgCapacityProps {
  const minInstancesKey = "minInstances";
  const maxInstancesKey = "maxInstances";
  const minInstances: GuStageDependentNumber = {
    variableName: minInstancesKey,
    codeValue: capacity.minimumCodeInstances,
    prodValue: capacity.minimumProdInstances,
  };
  const maxInstances: GuStageDependentNumber = {
    variableName: maxInstancesKey,
    codeValue: capacity.maximumCodeInstances ?? capacity.minimumCodeInstances * 2,
    prodValue: capacity.maximumProdInstances ?? capacity.minimumProdInstances * 2,
  };
  stack.setStageDependentValue(minInstances);
  stack.setStageDependentValue(maxInstances);
  return {
    minCapacity: stack.getStageDependentValue(minInstancesKey),
    maxCapacity: stack.getStageDependentValue(maxInstancesKey),
  };
}

export class GuAutoScalingGroup extends AutoScalingGroup {
  constructor(scope: GuStack, id: string, props: GuAutoScalingGroupProps) {
    // We need to override getImage() so that we can pass in the AMI as a parameter
    // Otherwise, MachineImage.lookup({ name: 'some str' }) would work as long
    // as the name is hard-coded
    function getImage(): MachineImageConfig {
      return {
        osType: props.osType ?? OperatingSystemType.LINUX,
        userData: UserData.custom(props.userData),
        imageId:
          props.imageId?.valueAsString ??
          new GuAmiParameter(scope, "AMI", {
            description: "AMI ID",
          }).valueAsString,
      };
    }

    const mergedProps = {
      ...props,
      ...wireCapacityProps(scope, props.capacity),
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
