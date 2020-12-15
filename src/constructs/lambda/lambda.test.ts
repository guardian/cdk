import "@aws-cdk/assert/jest";
import { Schedule } from "@aws-cdk/aws-events";
import { Runtime } from "@aws-cdk/aws-lambda";
import { App, Duration } from "@aws-cdk/core";
import { GuStack } from "../core";
import { GuLambdaFunction } from "./lambda";

describe("The GuLambdaFunction class", () => {
  it("should create the code object from the bucket and key passed in", () => {
    const stack = new GuStack(new App());

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });

    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Code: {
        S3Bucket: "bucket1",
        S3Key: "folder/to/key",
      },
    });
  });

  it("should not have any schedule rules by default", () => {
    const stack = new GuStack(new App());

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });

    expect(stack).not.toHaveResource("AWS::Events::Rule");
  });

  it("should add any rules passed in", () => {
    const stack = new GuStack(new App());

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      rules: [
        {
          schedule: Schedule.rate(Duration.days(7)),
          description: "run every week",
        },
        {
          schedule: Schedule.expression("0 1 * * *"),
          description: "run every hour (cron)",
        },
      ],
    });

    expect(stack).toHaveResource("AWS::Events::Rule", {
      Description: "run every week",
      ScheduleExpression: "rate(7 days)",
    });
    expect(stack).toHaveResource("AWS::Events::Rule", {
      Description: "run every hour (cron)",
      ScheduleExpression: "0 1 * * *",
    });
  });

  it("should add any apis passed in", () => {
    const stack = new GuStack(new App());

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      apis: [
        {
          id: "api",
          description: "this is a test",
        },
        {
          id: "api2",
          description: "this is a test2",
        },
      ],
    });

    expect(stack).toHaveResource("AWS::ApiGateway::RestApi", {
      Description: "this is a test",
      Name: "api",
    });
    expect(stack).toHaveResource("AWS::ApiGateway::RestApi", {
      Description: "this is a test2",
      Name: "api2",
    });
  });

  it("should give the function read permissions to the required bucket", () => {
    const stack = new GuStack(new App());

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Action: ["s3:GetObject*", "s3:GetBucket*", "s3:List*"],
            Effect: "Allow",
            Resource: [
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition",
                    },
                    ":s3:::bucket1",
                  ],
                ],
              },
              {
                "Fn::Join": [
                  "",
                  [
                    "arn:",
                    {
                      Ref: "AWS::Partition",
                    },
                    ":s3:::bucket1/*",
                  ],
                ],
              },
            ],
          },
        ],
        Version: "2012-10-17",
      },
    });
  });
});
