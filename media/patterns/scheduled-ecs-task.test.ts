import { Duration } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
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

describe("The GuScheduledEcsTask pattern", () => {
  it("should use the specified schedule", () => {
    const stack = simpleGuStackForTesting();

    new GuScheduledEcsTask(stack, "test", {
      schedule: Schedule.rate(Duration.minutes(1)),
      containerConfiguration: { id: "node:10", type: "registry" },
      monitoringConfiguration: { noMonitoring: true },
      vpc: makeVpc(stack),
      app: "ecs-test",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::Events::Rule", { ScheduleExpression: "rate(1 minute)" });
  });
});
