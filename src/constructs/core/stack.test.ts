import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { ContextKeys, MetadataKeys } from "../../constants";
import { GuTemplate } from "../../utils/test";
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
    const stack = new GuStack(
      new App({ context: { [ContextKeys.REPOSITORY_URL]: "https://github.com/guardian/my-repository" } }),
      "Test",
      {
        stack: "test",
        stage: "TEST",
      }
    );

    new Role(stack, "MyRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::IAM::Role", {
      additionalTags: [
        {
          Key: MetadataKeys.REPOSITORY_NAME,
          Value: "guardian/my-repository",
        },
      ],
    });
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
