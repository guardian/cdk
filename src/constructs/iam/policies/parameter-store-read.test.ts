import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleTestingResources } from "../../../utils/test";
import { GuParameterStoreReadPolicy } from "./parameter-store-read";

describe("ParameterStoreReadPolicy", () => {
  it("should constrain the policy to the patch of a stack's identity", () => {
    const { stack, app } = simpleTestingResources({ appName: "MyApp" });

    const policy = new GuParameterStoreReadPolicy(app);

    attachPolicyToTestRole(stack, policy);

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
});
