import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { SecurityGroup, Vpc } from "@aws-cdk/aws-ec2";
import { Schedule } from "@aws-cdk/aws-events";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { Duration } from "@aws-cdk/core";
import type { GuStack } from "../constructs/core";
import { simpleGuStackForTesting } from "../utils/test";
import { GuScheduledEcsTask } from "./scheduled-ecs-task";

const vpc = (stack: GuStack) =>
  Vpc.fromVpcAttributes(stack, "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: ["abc-123"],
  });

const securityGroup = (stack: GuStack) => SecurityGroup.fromSecurityGroupId(stack, "hehe", "id-123");
const testPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["s3:GetObject"],
  resources: ["databaseSecretArn"],
});

describe("The GuScheduledEcsTask pattern", () => {
  it("should use the specified container", () => {
    const stack = simpleGuStackForTesting();

    new GuScheduledEcsTask(stack, {
      schedule: Schedule.rate(Duration.minutes(1)),
      containerConfiguration: { id: "node:10", type: "registry" },
      monitoringConfiguration: { noMonitoring: true },
      vpc: vpc(stack),
      stack: "test",
      stage: "TEST",
      app: "ecs-test",
    });

    expect(stack).toHaveResourceLike("AWS::ECS::TaskDefinition", { ContainerDefinitions: [{ Image: "node:10" }] });
  });

  it("should use the specified schedule", () => {
    const stack = simpleGuStackForTesting();

    new GuScheduledEcsTask(stack, {
      schedule: Schedule.rate(Duration.minutes(1)),
      containerConfiguration: { id: "node:10", type: "registry" },
      monitoringConfiguration: { noMonitoring: true },
      vpc: vpc(stack),
      stack: "test",
      stage: "TEST",
      app: "ecs-test",
    });

    expect(stack).toHaveResourceLike("AWS::Events::Rule", { ScheduleExpression: "rate(1 minute)" });
  });

  it("should create the correct resources with lots of config", () => {
    const stack = simpleGuStackForTesting();

    new GuScheduledEcsTask(stack, {
      schedule: Schedule.rate(Duration.minutes(1)),
      containerConfiguration: { id: "node:10", type: "registry" },
      vpc: vpc(stack),
      stack: "test",
      stage: "TEST",
      app: "ecs-test",
      taskTimeoutInMinutes: 60,
      cpu: 1024,
      memory: 1024,
      monitoringConfiguration: { snsTopicArn: "arn:something:else:here:we:goalarm-topic", noMonitoring: false },
      taskCommand: `echo "yo ho row ho it's a pirates life for me"`,
      securityGroups: [securityGroup(stack)],
      customTaskPolicies: [testPolicy],
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
