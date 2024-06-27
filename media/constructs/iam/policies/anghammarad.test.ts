import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuAnghammaradTopicParameter } from "../../core";
import { GuAnghammaradSenderPolicy } from "./anghammarad";

describe("GuAnghammaradSenderPolicy", () => {
  it("should add a parameter to the stack if it is not already defined", () => {
    const stack = simpleGuStackForTesting();

    // add the policy
    attachPolicyToTestRole(stack, GuAnghammaradSenderPolicy.getInstance(stack));
    Template.fromStack(stack).hasParameter("AnghammaradSnsArn", {});
  });

  it("should not add a parameter to the stack if it already exists", () => {
    const stack = simpleGuStackForTesting();

    // explicitly add an AnghammaradTopicParameter
    GuAnghammaradTopicParameter.getInstance(stack);
    Template.fromStack(stack).hasParameter("AnghammaradSnsArn", {});

    // add the policy
    attachPolicyToTestRole(stack, GuAnghammaradSenderPolicy.getInstance(stack));
    Template.fromStack(stack).hasParameter("AnghammaradSnsArn", {});
  });

  it("should define a policy that would allow writing to SNS", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, GuAnghammaradSenderPolicy.getInstance(stack));

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sns:Publish",
            Effect: "Allow",
            Resource: {
              Ref: "AnghammaradSnsArn",
            },
          },
        ],
      },
    });
  });
});
