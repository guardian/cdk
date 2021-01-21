import { SynthUtils } from "@aws-cdk/assert";
import "@aws-cdk/assert/jest";
import { Schedule } from "@aws-cdk/aws-events";
import { Runtime } from "@aws-cdk/aws-lambda";
import { Duration } from "@aws-cdk/core";
import { simpleGuStackForTesting } from "../../../test/utils/simple-gu-stack";
import { GuLambdaFunction } from "./lambda";

describe("The GuLambdaFunction class", () => {
  it("should create the code object from the bucket and key passed in", () => {
    const stack = simpleGuStackForTesting();

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
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
    });

    expect(stack).not.toHaveResource("AWS::Events::Rule");
  });

  it("should add any rules passed in", () => {
    const stack = simpleGuStackForTesting();

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
    const stack = simpleGuStackForTesting();

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

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should give the function read permissions to the required bucket", () => {
    const stack = simpleGuStackForTesting();

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

  it("should use the memorySize provided via props when it is defined", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
      memorySize: 2048,
    });

    expect(stack).toHaveResource("AWS::Lambda::Function", {
      MemorySize: 2048,
    });
  });

  it("should add a sensible default memorySize if none is provided", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
    });

    expect(stack).toHaveResource("AWS::Lambda::Function", {
      MemorySize: 1024,
    });
  });

  it("should use the timeout provided via props when it is defined", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
      timeout: Duration.seconds(60),
    });

    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Timeout: 60,
    });
  });

  it("should add a sensible default timeout if none is provided", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      code: { bucket: "bucket1", key: "folder/to/key" },
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
    });

    expect(stack).toHaveResource("AWS::Lambda::Function", {
      Timeout: 30,
    });
  });
});
