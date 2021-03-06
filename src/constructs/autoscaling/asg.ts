import type { AutoScalingGroupProps, CfnAutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import { AutoScalingGroup } from "@aws-cdk/aws-autoscaling";
import type { ISecurityGroup, MachineImage, MachineImageConfig } from "@aws-cdk/aws-ec2";
import { InstanceType, OperatingSystemType, UserData } from "@aws-cdk/aws-ec2";
import type { ApplicationTargetGroup } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Stage } from "../../constants";
import type { GuStack, GuStageDependentValue } from "../core";
import { GuAmiParameter, GuInstanceTypeParameter } from "../core";
import { GuHttpsEgressSecurityGroup } from "../ec2";

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
    | "securityGroup"
  > {
  stageDependentProps: GuStageDependentAsgProps;
  instanceType?: InstanceType;
  imageId?: GuAmiParameter;
  machineImage?: MachineImage;
  userData: UserData | string;
  additionalSecurityGroups?: ISecurityGroup[];
  targetGroup?: ApplicationTargetGroup;
  overrideId?: boolean;
}

type GuStageDependentAsgProps = Record<Stage, GuAsgCapacityProps>;

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

function wireStageDependentProps(stack: GuStack, stageDependentProps: GuStageDependentAsgProps): AwsAsgCapacityProps {
  const minInstancesKey = "minInstances";
  const maxInstancesKey = "maxInstances";
  const minInstances: GuStageDependentValue<number> = {
    variableName: minInstancesKey,
    stageValues: {
      [Stage.CODE]: stageDependentProps.CODE.minimumInstances,
      [Stage.PROD]: stageDependentProps.PROD.minimumInstances,
    },
  };
  const maxInstances: GuStageDependentValue<number> = {
    variableName: maxInstancesKey,
    stageValues: {
      [Stage.CODE]: stageDependentProps.CODE.maximumInstances ?? stageDependentProps.CODE.minimumInstances * 2,
      [Stage.PROD]: stageDependentProps.PROD.maximumInstances ?? stageDependentProps.PROD.minimumInstances * 2,
    },
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
    const userData = props.userData instanceof UserData ? props.userData : UserData.custom(props.userData);

    // We need to override getImage() so that we can pass in the AMI as a parameter
    // Otherwise, MachineImage.lookup({ name: 'some str' }) would work as long
    // as the name is hard-coded
    function getImage(): MachineImageConfig {
      return {
        osType: OperatingSystemType.LINUX,
        userData,
        imageId:
          props.imageId?.valueAsString ??
          new GuAmiParameter(scope, "AMI", {
            description: "AMI ID",
          }).valueAsString,
      };
    }

    const mergedProps = {
      ...props,
      ...wireStageDependentProps(scope, props.stageDependentProps),
      machineImage: { getImage: getImage },
      instanceType: props.instanceType ?? new InstanceType(new GuInstanceTypeParameter(scope).valueAsString),
      userData,

      // Do not use the default AWS security group which allows egress on any port.
      // Favour HTTPS only egress rules by default.
      securityGroup: GuHttpsEgressSecurityGroup.forVpc(scope, props),
    };

    super(scope, id, mergedProps);

    mergedProps.targetGroup && this.attachToApplicationTargetGroup(mergedProps.targetGroup);

    mergedProps.additionalSecurityGroups?.forEach((sg) => this.addSecurityGroup(sg));

    const cfnAsg = this.node.defaultChild as CfnAutoScalingGroup;
    // A CDK AutoScalingGroup comes with this update policy, whereas the CFN autscaling group
    // leaves it to the default value, which is actually false.
    // { UpdatePolicy: { autoScalingScheduledAction: { IgnoreUnmodifiedGroupSizeProperties: true }}
    cfnAsg.addDeletionOverride("UpdatePolicy");

    if (mergedProps.overrideId) cfnAsg.overrideLogicalId(id);
  }
}
