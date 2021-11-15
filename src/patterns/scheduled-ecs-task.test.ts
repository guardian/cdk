import { SynthUtils } from "@aws-cdk/assert";
import "@aws-cdk/assert/jest";
import type { IVpc } from "@aws-cdk/aws-ec2";
import { SecurityGroup, Vpc } from "@aws-cdk/aws-ec2";
import { Schedule } from "@aws-cdk/aws-events";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { Duration } from "@aws-cdk/core";
import type { GuStack } from "../constructs/core";
import { simpleGuStackForTesting } from "../utils/test";
import "../utils/test/jest";
import { GuScheduledEcsTask } from "./scheduled-ecs-task";

const makeVpc = (stack: GuStack) =>
  Vpc.fromVpcAttributes(stack, "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: ["abc-123"],
  });

const securityGroup = (stack: GuStack, app?: string) =>
  SecurityGroup.fromSecurityGroupId(stack, `hehe-${app ?? ""}`, "id-123");
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
      vpc: makeVpc(stack),
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
      vpc: makeVpc(stack),
      stack: "test",
      stage: "TEST",
      app: "ecs-test",
    });

    expect(stack).toHaveResourceLike("AWS::Events::Rule", { ScheduleExpression: "rate(1 minute)" });
    expect(stack).toHaveResourceLike("AWS::Events::Rule", { State: "ENABLED" });
  });

  it("should be disabled when scheduleEnabled is set to false", () => {
    const stack = simpleGuStackForTesting();

    new GuScheduledEcsTask(stack, {
      schedule: Schedule.rate(Duration.minutes(1)),
      containerConfiguration: { id: "node:10", type: "registry" },
      monitoringConfiguration: { noMonitoring: true },
      vpc: makeVpc(stack),
      stack: "test",
      stage: "TEST",
      app: "ecs-test",
      scheduleEnabled: false,
    });

    expect(stack).toHaveResourceLike("AWS::Events::Rule", { State: "DISABLED" });
  });

  const generateComplexStack = (stack: GuStack, app: string, vpc: IVpc) => {
    new GuScheduledEcsTask(stack, {
      schedule: Schedule.rate(Duration.minutes(1)),
      containerConfiguration: { id: "node:10", type: "registry" },
      vpc,
      stack: "test",
      stage: "TEST",
      app: app,
      taskTimeoutInMinutes: 60,
      cpu: 1024,
      memory: 1024,
      monitoringConfiguration: { snsTopicArn: "arn:something:else:here:we:goalarm-topic", noMonitoring: false },
      taskCommand: `echo "yo ho row ho it's a pirates life for me"`,
      securityGroups: [securityGroup(stack, app)],
      customTaskPolicies: [testPolicy],
    });
  };

  it("should create the correct resources with lots of config", () => {
    const stack = simpleGuStackForTesting();

    generateComplexStack(stack, "ecs-test", makeVpc(stack));

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should support having more than one scheduled task in the same stack", () => {
    const stack = simpleGuStackForTesting();

    const vpc = makeVpc(stack);

    generateComplexStack(stack, "ecs-test2", vpc);
    generateComplexStack(stack, "ecs-test", vpc);

    expect(stack).toHaveGuTaggedResource("AWS::ECS::TaskDefinition", { appIdentity: { app: "ecs-test" } });
    expect(stack).toHaveGuTaggedResource("AWS::ECS::TaskDefinition", { appIdentity: { app: "ecs-test2" } });
  });
});
