import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { GuPolicy } from "../../../constructs/iam";
import { GuStack } from "../../../constructs/core";

export interface GuECSInstanceRolePolicyForManagedInstancesProps {
  /** ARN of cluster the capacity provider is scoped to. */
  clusterArn: string;
}

/**
 * Used by ECS Managed Instances to communicate with Amazon ECS service, scoped to a ECS cluster.
 *
 * Amazon provide a managed version of this policy but it is not scoped to a specific cluster, despite
 * the fact that managed EC2 instances from a capacity provider can only be used with 1 cluster.
 *
 * See Amazons managed version:
 * https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonECSInstanceRolePolicyForManagedInstances.html
 */
export class GuECSInstanceRolePolicyForManagedInstances extends GuPolicy {
  constructor(scope: GuStack, id: string, props: GuECSInstanceRolePolicyForManagedInstancesProps) {
    super(scope, id, {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ecs:DiscoverPollEndpoint"],
          resources: ["*"],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ecs:RegisterContainerInstance"],
          resources: [props.clusterArn],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ecs:Poll"],
          resources: ["arn:aws:ecs:*:*:container-instance/*", "arn:aws:ecs:*:*:task-set/*"],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ecs:StartTelemetrySession", "ecs:PutSystemLogEvents"],
          resources: ["arn:aws:ecs:*:*:container-instance/*"],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["ecs:SubmitAttachmentStateChanges", "ecs:SubmitTaskStateChange"],
          resources: [props.clusterArn],
        }),
      ],
    });
  }
}
