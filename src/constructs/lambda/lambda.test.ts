import { Duration } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuLambdaFunction } from "./lambda";

describe("The GuLambdaFunction class", () => {
  it("should create the code object from the bucket and key passed in", () => {
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

  it("should not have any schedule rules by default", () => {
    const stack = simpleGuStackForTesting();

    new GuLambdaFunction(stack, "lambda", {
      fileName: "my-app.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });

    Template.fromStack(stack).resourceCountIs("AWS::Events::Rule", 0);
  });

  it("should add an alarm if errorPercentageMonitoring is passed in", () => {
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

  it("should give the function read permissions to the required bucket", () => {
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

  it("should use the memorySize provided via props when it is defined", () => {
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

  it("should add a sensible default memorySize if none is provided", () => {
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

  it("should use the timeout provided via props when it is defined", () => {
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

  it("should add a sensible default timeout if none is provided", () => {
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
});
