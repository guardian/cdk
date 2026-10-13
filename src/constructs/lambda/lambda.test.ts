import { suite, test } from "node:test";
import { Duration } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { LoggingFormat, Runtime } from "aws-cdk-lib/aws-lambda";
import { simpleGuStackForTesting } from "../../utils/test";
import type { GuStack } from "../core";
import { GuLambdaFunction } from "./lambda";

suite("The GuLambdaFunction class", () => {
  test("should create the code object from the bucket and key passed in", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Code: {
        S3Bucket: {
          Ref: "DistributionBucketName",
        },
        S3Key: "test-stack/TEST/testing/my-app.zip",
      },
    });
  });

  test("should not have any schedule rules by default", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });

    Template.fromStack(stack).resourceCountIs("AWS::Events::Rule", 0);
  });

  test("should add an alarm if errorPercentageMonitoring is passed in", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      errorPercentageMonitoring: {
        toleratedErrorPercentage: 5,
        snsTopicName: "test-topic",
      },
      app: "testing",
    });

    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1); // The shape of this alarm is tested via lambda-alarms.test.ts
  });

  test("should give the function read permissions to the required bucket", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
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
                    ":s3:::",
                    {
                      Ref: "DistributionBucketName",
                    },
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
                    ":s3:::",
                    {
                      Ref: "DistributionBucketName",
                    },
                    "/test-stack/TEST/testing/my-app.zip",
                  ],
                ],
              },
            ],
          },
        ]),
        Version: "2012-10-17",
      },
    });
  });

  test("should use the memorySize provided via props when it is defined", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.jar",
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
      memorySize: 2048,
      app: "testing",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      MemorySize: 2048,
    });
  });

  test("should add a sensible default memorySize if none is provided", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.jar",
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
      app: "testing",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      MemorySize: 1024,
    });
  });

  test("should use the timeout provided via props when it is defined", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.jar",
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
      timeout: Duration.seconds(60),
      app: "testing",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Timeout: 60,
    });
  });

  test("should add a sensible default timeout if none is provided", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.jar",
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
      app: "testing",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Timeout: 30,
    });
  });

  test("should support bucket override", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.jar",
      bucketNamePath: "/example-parameter-path", // the override
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
      app: "testing",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Code: {
        S3Bucket: {
          Ref: Match.not("DistributionBucketName"),
        },
      },
    });
  });

  function hasLoggingFormat(stack: GuStack, logFormat: LoggingFormat) {
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      LoggingConfig: {
        LogFormat: logFormat,
      },
    });
  }

  test("should use JSON log formatting by default", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.jar",
      handler: "handler.ts",
      runtime: Runtime.JAVA_17,
      app: "testing",
    });

    hasLoggingFormat(stack, LoggingFormat.JSON);
  });

  test("should use JSON log formatting when JSON is specified", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.jar",
      handler: "handler.ts",
      runtime: Runtime.JAVA_17,
      app: "testing",
      loggingFormat: LoggingFormat.JSON,
    });

    hasLoggingFormat(stack, LoggingFormat.JSON);
  });
  test("should use Text log formatting when it is defined", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.jar",
      handler: "handler.ts",
      runtime: Runtime.JAVA_17,
      app: "testing",
      loggingFormat: LoggingFormat.TEXT,
    });

    hasLoggingFormat(stack, LoggingFormat.TEXT);
  });

  test("should not create an alias or version if the enableVersioning prop is unset", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.jar",
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
      app: "testing",
    });

    Template.fromStack(stack).resourceCountIs("AWS::Lambda::Version", 0);
    Template.fromStack(stack).resourceCountIs("AWS::Lambda::Alias", 0);
  });

  test("should create a function version and alias if the enableVersioning prop is set to true", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      enableVersioning: true,
      fileName: "build123.jar",
      handler: "handler.ts",
      runtime: Runtime.JAVA_8,
      app: "testing",
    });

    Template.fromStack(stack).resourceCountIs("AWS::Lambda::Version", 1);
    Template.fromStack(stack).resourceCountIs("AWS::Lambda::Alias", 1);
  });
});
