import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuSESSenderPolicy } from "./ses";

describe("GuSESSenderPolicy", () => {
  it("should have a policy that is tightly scoped", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, new GuSESSenderPolicy(stack, { sendingAddress: "no-reply@theguardian.com" }));

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "ses:SendEmail",
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:ses:",
                  {
                    Ref: "AWS::Region",
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":identity/no-reply@theguardian.com",
                ],
              ],
            },
          },
        ],
      },
    });
  });
});
