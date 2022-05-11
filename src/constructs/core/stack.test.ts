import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { ContextKeys, TagKeys } from "../../constants";
import { GuTemplate } from "../../utils/test";
import { GuParameter } from "./parameters";
import type { GuStackProps } from "./stack";
import { GuStack } from "./stack";

describe("The GuStack construct", () => {
  it("should apply the stack and stage tags to resources added to it", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test", stage: "TEST" });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::IAM::Role");
  });

  it("should not apply any tags when withoutTags is set to true", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test", stage: "TEST", withoutTags: true });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
      Tags: Match.absent(),
    });
  });

  it("should prefer context values for repository information", () => {
    const stack = new GuStack(new App({ context: { [ContextKeys.REPOSITORY_URL]: "my-repository" } }), "Test", {
      stack: "test",
      stage: "TEST",
    });

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::IAM::Role", {
      additionalTags: [
        {
          Key: TagKeys.REPOSITORY_NAME,
          Value: "my-repository",
        },
      ],
    });
  });

  it("should return a parameter that exists", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test", stage: "TEST" });
    const testParam = new GuParameter(stack, "MyTestParam", {});
    stack.setParam(testParam);

    const actual = stack.getParam<GuParameter>("MyTestParam");
    expect(actual).toBe(testParam);
  });

  it("should throw on attempt to get a parameter that doesn't exist", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test", stage: "TEST" });

    expect(() => stack.getParam<GuParameter>("i-do-not-exist")).toThrowError(
      "Attempting to read parameter i-do-not-exist which does not exist"
    );
  });

  it("can persist the logicalId for any resource (consumer's POV)", () => {
    class MigratingStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- for testing purposes
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        const sqs = new Queue(this, "Notifications For External Users", {});

        this.overrideLogicalId(sqs, {
          logicalId: "Notifications",
          reason:
            "Persisting this logicalId from the YAML template as the resource is stateful and used by multiple downstream systems that we don't own.",
        });
      }
    }

    const stack = new MigratingStack(new App(), "Test", { stack: "test", stage: "TEST" });
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::SQS::Queue", "Notifications");
  });
});
