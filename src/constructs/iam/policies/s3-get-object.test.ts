import "@aws-cdk/assert/jest";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { App } from "@aws-cdk/core";
import { GuStack } from "../../core";
import { GuGetS3ObjectPolicy } from "./s3-get-object";

describe("The GuGetS3ObjectPolicy class", () => {
  it("sets default props", () => {
    const stack = new GuStack(new App());

    const s3Policy = new GuGetS3ObjectPolicy(stack, "S3Policy", { bucket: "test" });

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    s3Policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: "arn:aws:s3:::test/*",
            Action: "s3:GetObject",
          },
        ],
      },
    });
  });

  it("merges defaults and passed in props", () => {
    const stack = new GuStack(new App());

    const s3Policy = new GuGetS3ObjectPolicy(stack, "S3Policy", { bucket: "test", policyName: "test" });

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    s3Policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "test",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Resource: "arn:aws:s3:::test/*",
            Action: "s3:GetObject",
          },
        ],
      },
    });
  });
});
