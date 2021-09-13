import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { SecurityGroup, Vpc } from "@aws-cdk/aws-ec2";
import { Schedule } from "@aws-cdk/aws-events";
import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import { Duration } from "@aws-cdk/core";
import { simpleGuStackForTesting } from "../utils/test";
import { GuScheduledEcsTask } from "./scheduled-ecs-task";

describe("The GuScheduledEcsTask pattern", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();

    const vpc = Vpc.fromVpcAttributes(stack, "VPC", {
      vpcId: "test",
      availabilityZones: [""],
      publicSubnetIds: [""],
      privateSubnetIds: ["abc-123"],
    });
    new GuScheduledEcsTask(stack, {
      schedule: Schedule.rate(Duration.minutes(1)),
      containerConfiguration: { id: "node:10" },
      vpc: vpc,
      stack: "test",
      stage: "TEST",
      app: "ecs-test",
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should create the correct resources with lots of config", () => {
    const stack = simpleGuStackForTesting();

    const vpc = Vpc.fromVpcAttributes(stack, "VPC", {
      vpcId: "test",
      availabilityZones: [""],
      publicSubnetIds: [""],
      privateSubnetIds: ["abc-123"],
    });

    const securityGroup = SecurityGroup.fromSecurityGroupId(stack, "hehe", "id-123");
    const testPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:GetObject"],
      resources: ["databaseSecretArn"],
    });

    new GuScheduledEcsTask(stack, {
      schedule: Schedule.rate(Duration.minutes(1)),
      containerConfiguration: { id: "node:10" },
      vpc: vpc,
      stack: "test",
      stage: "TEST",
      app: "ecs-test",
      taskTimeoutInMinutes: 60,
      cpu: 1024,
      memory: 1024,
      alarmSnsTopicArn: "arn:something:else:here:we:goalarm-topic",
      taskCommand: `echo "yo ho row ho it's a pirates life for me"`,
      securityGroups: [securityGroup],
      customTaskPolicies: [testPolicy],
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
