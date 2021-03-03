import "@aws-cdk/assert/jest";
import { App } from "@aws-cdk/core";
import { attachPolicyToTestRole } from "../../../../test/utils";
import { GuStack } from "../../core";
import { GuParameterStoreReadPolicy } from "./parameter-store-read";

describe("ParameterStoreReadPolicy", () => {
  it("should constrain the policy to the patch of a stack's identity", () => {
    const stack = new GuStack(new App(), "my-app", { app: "MyApp", stack: "test-stack" });

    const policy = new GuParameterStoreReadPolicy(stack);

    attachPolicyToTestRole(stack, policy);

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
                  ":parameter/test-stack/",
                  {
                    Ref: "Stage",
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
});
