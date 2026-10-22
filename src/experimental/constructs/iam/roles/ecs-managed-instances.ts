import { ManagedPolicy, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../../../constructs/core";
import { GuRole } from "../../../../constructs/iam";
import { GuECSInstanceRolePolicyForManagedInstances } from "../../policies/ecs-managed-instances-role-policy";

export interface GuECSManagedInstanceRoleProps {
  /**
   * The ARN of the ECS cluster that this role will be used with
   */
  clusterArn: string;
}

/**
 * Role for ECS Managed Instances that the ECS agent assumes to communicate
 * with the Amazon ECS service.
 *
 * Scoped to a ECS cluster.
 */
export class GuECSManagedInstanceRole extends GuRole {
  constructor(scope: GuStack, id: string, props: GuECSManagedInstanceRoleProps) {
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
    const ecsInstanceRolePolicy = new GuECSInstanceRolePolicyForManagedInstances(scope, "ECSInstanceRolePolicy", {
      clusterArn: props.clusterArn,
    });

    ecsInstanceRolePolicy.attachToRole(this);
  }
}
