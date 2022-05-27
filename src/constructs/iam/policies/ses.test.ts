import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleTestingResources } from "../../../utils/test";
import { GuSESSenderPolicy } from "./ses";

describe("GuSESSenderPolicy", () => {
  it("should have a policy that reads from a parameter", () => {
    const { stack, app } = simpleTestingResources();
    attachPolicyToTestRole(stack, new GuSESSenderPolicy(app));

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
    const { stack, app } = simpleTestingResources();
    attachPolicyToTestRole(stack, new GuSESSenderPolicy(app));
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
