import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuLogShippingPolicy } from "./log-shipping";
import type { SynthedStack } from "../../../utils/test";

describe("The GuLogShippingPolicy singleton class", () => {
  it("creates a policy restricted to a kinesis stream defined in a parameter", () => {
    const stack = simpleGuStackForTesting();

    const logShippingPolicy = GuLogShippingPolicy.getInstance(stack);
    attachPolicyToTestRole(stack, logShippingPolicy);

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(json.Parameters.LoggingStreamName).toEqual({
      Type: "AWS::SSM::Parameter::Value<String>",
      Default: "/account/services/logging.stream.name",
      Description: "SSM parameter containing the Name (not ARN) on the kinesis stream",
    });

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "GuLogShippingPolicy981BFE5A",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["kinesis:Describe*", "kinesis:Put*"],
            Effect: "Allow",
            Resource: {
              "Fn::Join": [
                "",
                [
                  "arn:aws:kinesis:",
                  {
                    Ref: "AWS::Region",
                  },
                  ":",
                  {
                    Ref: "AWS::AccountId",
                  },
                  ":stream/",
                  {
                    Ref: "LoggingStreamName",
                  },
                ],
              ],
            },
          },
        ],
      },
    });
  });

  it("will only be defined once in a stack, even when attached to multiple roles", () => {
    const stack = simpleGuStackForTesting();

    const logShippingPolicy = GuLogShippingPolicy.getInstance(stack);
    attachPolicyToTestRole(stack, logShippingPolicy, "MyFirstRole");
    attachPolicyToTestRole(stack, logShippingPolicy, "MySecondRole");

    expect(stack).toCountResources("AWS::IAM::Policy", 1);
    expect(stack).toCountResources("AWS::IAM::Role", 2);
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("works across multiple stacks", () => {
    const stack1 = simpleGuStackForTesting();
    const stack2 = simpleGuStackForTesting();

    const logShippingPolicy1 = GuLogShippingPolicy.getInstance(stack1);
    const logShippingPolicy2 = GuLogShippingPolicy.getInstance(stack2);

    attachPolicyToTestRole(stack1, logShippingPolicy1);
    attachPolicyToTestRole(stack2, logShippingPolicy2);

    expect(stack1).toCountResources("AWS::IAM::Policy", 1);
    expect(stack1).toCountResources("AWS::IAM::Role", 1);

    expect(stack2).toCountResources("AWS::IAM::Policy", 1);
    expect(stack2).toCountResources("AWS::IAM::Role", 1);
  });
});
