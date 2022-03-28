import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import type { SynthedStack } from "../../../utils/test";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import type { GuStack } from "../../core";
import { GuAnghammaradTopicParameter } from "../../core";
import { GuAnghammaradSenderPolicy } from "./anghammarad";

describe("GuAnghammaradSenderPolicy", () => {
  const getParams = (stack: GuStack) => {
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    return Object.keys(json.Parameters);
  };

  it("should add a parameter to the stack if it is not already defined", () => {
    const stack = simpleGuStackForTesting();

    // add the policy
    attachPolicyToTestRole(stack, GuAnghammaradSenderPolicy.getInstance(stack));
    expect(getParams(stack)).toEqual(["AnghammaradSnsArn"]);
  });

  it("should not add a parameter to the stack if it already exists", () => {
    const stack = simpleGuStackForTesting();

    // explicitly add an AnghammaradTopicParameter
    GuAnghammaradTopicParameter.getInstance(stack);
    expect(getParams(stack)).toEqual(["AnghammaradSnsArn"]);

    // add the policy
    attachPolicyToTestRole(stack, GuAnghammaradSenderPolicy.getInstance(stack));
    expect(getParams(stack)).toEqual(["AnghammaradSnsArn"]);
  });

  it("should define a policy that would allow writing to SNS", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, GuAnghammaradSenderPolicy.getInstance(stack));

    expect(stack).toHaveResource("AWS::IAM::Policy", {
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
