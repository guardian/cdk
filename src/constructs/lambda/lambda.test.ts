import "@aws-cdk/assert/jest";

import { SynthUtils } from "@aws-cdk/assert";
import { Schedule } from "@aws-cdk/aws-events";
import { Runtime } from "@aws-cdk/aws-lambda";
import { Duration, Stack } from "@aws-cdk/core";
import { GuLambdaFunction } from "./lambda";

describe("GuLambdaFunction", () => {
  it("should create a lambda function with no schedule rules", () => {
    const stack = new Stack();

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should create a lambda function with a schedule to run every week", () => {
    const stack = new Stack();

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      rules: [
        {
          schedule: Schedule.rate(Duration.days(7)),
          description: "run every week",
        },
      ],
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should create a lambda function with an api gateway", () => {
    const stack = new Stack();

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      apis: [
        {
          id: "api",
          description: "this is a test",
        },
      ],
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
