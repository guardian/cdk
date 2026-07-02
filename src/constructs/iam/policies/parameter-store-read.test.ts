import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuParameterStoreReadPolicy } from "./parameter-store-read";

describe("GuParameterStoreReadPolicy", () => {
  it("should constrain the policy to the path of a stack's identity", () => {
    const stack = simpleGuStackForTesting();

    const policy = GuParameterStoreReadPolicy.getInstance(stack, { app: "MyApp" });

    attachPolicyToTestRole(stack, policy);

    Template.fromStack(stack).resourceCountIs("AWS::IAM::Policy", 1);

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
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
                  ":parameter/TEST/test-stack/MyApp",
                ],
              ],
            },
          },
          {
            Action: ["ssm:GetParameters", "ssm:GetParameter"],
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
                  ":parameter/TEST/test-stack/MyApp/*",
                ],
              ],
            },
          },
        ],
      },
    });
  });

  it("can be instantiated for multiple apps", () => {
    const stack = simpleGuStackForTesting();

    const policy1 = GuParameterStoreReadPolicy.getInstance(stack, { app: "MyApp1" });
    const policy2 = GuParameterStoreReadPolicy.getInstance(stack, { app: "MyApp2" });

    attachPolicyToTestRole(stack, policy1, "MyRole1");
    attachPolicyToTestRole(stack, policy2, "MyRole2");

    Template.fromStack(stack).resourceCountIs("AWS::IAM::Policy", 2);
  });
});
