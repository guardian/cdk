import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import type { SynthedStack } from "../../../utils/test";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import type { GuStack } from "../../core";
import { AnghammaradTopicParameter } from "../../core/parameters/anghammarad";
import { AnghammaradSenderPolicy } from "./anghammarad";

describe("AnghammaradSenderPolicy", () => {
  const getParams = (stack: GuStack) => {
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    return Object.keys(json.Parameters);
  };

  it("should add a parameter to the stack if it is not already defined", () => {
    const stack = simpleGuStackForTesting();

    // an empty stack should only have `Stage` which GuStack adds
    expect(getParams(stack)).toEqual(["Stage"]);

    // add the policy
    attachPolicyToTestRole(stack, AnghammaradSenderPolicy.getInstance(stack));
    expect(getParams(stack)).toEqual(["Stage", "AnghammaradSnsArn"]);
  });

  it("should not add a parameter to the stack if it already exists", () => {
    const stack = simpleGuStackForTesting();

    // an empty stack should only have `Stage` which GuStack adds
    expect(getParams(stack)).toEqual(["Stage"]);

    // explicitly add an AnghammaradTopicParameter
    AnghammaradTopicParameter.getInstance(stack);
    expect(getParams(stack)).toEqual(["Stage", "AnghammaradSnsArn"]);

    // add the policy
    attachPolicyToTestRole(stack, AnghammaradSenderPolicy.getInstance(stack));
    expect(getParams(stack)).toEqual(["Stage", "AnghammaradSnsArn"]);
  });

  it("should define a policy that would allow writing to SNS", () => {
    const stack = simpleGuStackForTesting();
    attachPolicyToTestRole(stack, AnghammaradSenderPolicy.getInstance(stack));

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
