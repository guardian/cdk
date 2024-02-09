import { Duration } from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
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
  it("should meet AWS Foundational Security Best Practices", () => {
    const stack = simpleGuStackForTesting();

    new GuScheduledEcsTask(stack, "test", {
      schedule: Schedule.rate(Duration.minutes(1)),
      containerConfiguration: { id: "node:10", type: "registry" },
      monitoringConfiguration: { noMonitoring: true },
      vpc: makeVpc(stack),
      app: "ecs-test",
    });

    const warnings = Annotations.fromStack(stack).findWarning("*", Match.stringLikeRegexp("AwsSolutions-.*"));

    // try to provide helpful messages for debugging
    if (warnings.length > 0) {
      console.log(JSON.stringify(warnings, null, 2));
    }
    expect(warnings).toHaveLength(0);

    const errors = Annotations.fromStack(stack).findError("*", Match.stringLikeRegexp("AwsSolutions-.*"));

    // try to provide helpful messages for debugging
    if (errors.length > 0) {
      console.log(JSON.stringify(errors, null, 2));
    }
    expect(errors).toHaveLength(0);
  });

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
