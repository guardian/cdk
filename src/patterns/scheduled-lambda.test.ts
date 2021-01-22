import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Schedule } from "@aws-cdk/aws-events";
import { Runtime } from "@aws-cdk/aws-lambda";
import { Duration } from "@aws-cdk/core";
import { simpleGuStackForTesting } from "../../test/utils";
import { GuScheduledLambda } from "./scheduled-lambda";

describe("The GuScheduledLambda pattern", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      schedule: Schedule.rate(Duration.seconds(60)),
    };
    new GuScheduledLambda(stack, "my-lambda-function", props);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should create an alarm if monitoring configuration is provided", () => {
    const stack = simpleGuStackForTesting();
    const props = {
      code: { bucket: "test-dist", key: "lambda.zip" },
      functionName: "my-lambda-function",
      handler: "my-lambda/handler",
      runtime: Runtime.NODEJS_12_X,
      schedule: Schedule.rate(Duration.seconds(60)),
      monitoringConfiguration: {
        toleratedErrorPercentage: 99,
        snsTopicName: "alerts-topic",
      },
    };
    new GuScheduledLambda(stack, "my-lambda-function", props);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
    expect(stack).toHaveResource("AWS::CloudWatch::Alarm");
  });
});
