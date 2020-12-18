import "@aws-cdk/assert/jest";
import { Role, ServicePrincipal } from "@aws-cdk/aws-iam";
import { App } from "@aws-cdk/core";
import { GuStack } from "../../core";
import { GuParameterStoreReadPolicy } from "./parameter-store-read";

describe("ParameterStoreReadPolicy", () => {
  it("should constrain the policy when GuStack has app set", () => {
    const stack = new GuStack(new App(), "my-app", { app: "MyApp" });

    const policy = new GuParameterStoreReadPolicy(stack);

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "parameter-store-read-policy",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "ssm:GetParametersByPath",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:ssm:",
                  {
                    Ref: "AWS::Region",
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":parameter/",
                  {
                    Ref: "Stage",
                  },
                  "/",
                  {
                    Ref: "Stack",
                  },
                  "/MyApp",
                ],
              ],
            },
          },
        ],
      },
    });
  });

  it("should handle a GuStack with no app set", () => {
    const stack = new GuStack(new App());

    const policy = new GuParameterStoreReadPolicy(stack);

    // IAM Policies need to be attached to a role, group or user to be created in a stack
    policy.attachToRole(
      new Role(stack, "TestRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      })
    );

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "parameter-store-read-policy",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "ssm:GetParametersByPath",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:ssm:",
                  {
                    Ref: "AWS::Region",
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":parameter/",
                  {
                    Ref: "Stage",
                  },
                  "/",
                  {
                    Ref: "Stack",
                  },
                  "/*",
                ],
              ],
            },
          },
        ],
      },
    });
  });
});
