import "@aws-cdk/assert/jest";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { App } from "@aws-cdk/core";
import { GuStack } from "../../core";
import { GuLogShippingPolicy } from "./log-shipping";

describe("The GuLogShippingPolicy class", () => {
  it("sets default props", () => {
    const stack = new GuStack(new App());

    const logShippingPolicy = new GuLogShippingPolicy(stack, "LogShippingPolicy", { kinesisStreamName: "test" });

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    logShippingPolicy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "log-shipping-policy",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["kinesis:Describe*", "kinesis:Put*"],
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:kinesis:",
                  {
                    Ref: "AWS::Region",
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":stream/test",
                ],
              ],
            },
          },
        ],
      },
    });
  });

  it("merges defaults and passed in props", () => {
    const stack = new GuStack(new App());

    const logShippingPolicy = new GuLogShippingPolicy(stack, "LogShippingPolicy", {
      kinesisStreamName: "test",
      policyName: "test",
    });

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    logShippingPolicy.attachToRole(
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
            Action: ["kinesis:Describe*", "kinesis:Put*"],
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:kinesis:",
                  {
                    Ref: "AWS::Region",
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":stream/test",
                ],
              ],
            },
          },
        ],
      },
    });
  });
});
