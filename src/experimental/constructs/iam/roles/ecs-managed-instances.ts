import type { ICluster } from "aws-cdk-lib/aws-ecs";
import { ManagedPolicy, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../../../constructs/core";
import { GuRole } from "../../../../constructs/iam";
import { GuECSInstanceRolePolicyForManagedInstancesExperimental } from "../../policies/ecs-managed-instances-role-policy";

export interface GuECSManagedInstanceRoleExperimentalProps {
  /**
   * ECS cluster that this role will be used with
   */
  cluster: ICluster;
}

/**
 * Role for ECS Managed Instances that the ECS agent assumes to communicate
 * with the Amazon ECS service.
 *
 * Scoped to a ECS cluster.
 */
export class GuECSManagedInstanceRoleExperimental extends GuRole {
  constructor(scope: GuStack, id: string, props: GuECSManagedInstanceRoleExperimentalProps) {
    // Allows the EC2 instance to pull images from the registry
    const ecsRegistryPullPolicy = ManagedPolicy.fromManagedPolicyArn(
      scope,
      "ECSRegistryPullPolicy",
      "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    );

    super(scope, id, {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [ecsRegistryPullPolicy],
    });

    // Allows the EC2 instance to register with the cluster and ECS
    const ecsInstanceRolePolicy = new GuECSInstanceRolePolicyForManagedInstancesExperimental(
      scope,
      "ECSInstanceRolePolicy",
      {
        cluster: props.cluster,
      },
    );

    ecsInstanceRolePolicy.attachToRole(this);
  }
}
