import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuSESSenderPolicy } from "./ses";

describe("GuSESSenderPolicy", () => {
  it("should have a policy that reads from a parameter", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, new GuSESSenderPolicy(stack));

    expect(stack).toHaveResource("AWS::IAM::Policy", {
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
                  ":identity/",
                  {
                    Ref: "EmailSenderAddress",
                  },
                ],
              ],
            },
          },
        ],
      },
    });
  });

  it("should add a parameter to the stack for the sending email address", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, new GuSESSenderPolicy(stack));
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
