import { suite, test } from "node:test";
import { Duration } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { ContainerInsights } from "aws-cdk-lib/aws-ecs";
import { Schedule } from "aws-cdk-lib/aws-events";
import type { GuStack } from "../constructs/core";
import { simpleGuStackForTesting } from "../utils/test";
import { GuScheduledEcsTask } from "./scheduled-ecs-task";

const makeVpc = (stack: GuStack) =>
  Vpc.fromVpcAttributes(stack, "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: ["abc-123"],
  });

suite("The GuScheduledEcsTask pattern", () => {
  test("should use the specified schedule", (t) => {
    const stack = simpleGuStackForTesting();
    const vpc = makeVpc(stack);
    new GuScheduledEcsTask(stack, "test", {
      schedule: Schedule.rate(Duration.minutes(1)),
      containerConfiguration: { id: "node:10", type: "registry" },
      monitoringConfiguration: { noMonitoring: true },
      vpc,
      app: "ecs-test",
      subnets: vpc.privateSubnets,
      containerInsights: ContainerInsights.DISABLED,
    });

    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });
});
