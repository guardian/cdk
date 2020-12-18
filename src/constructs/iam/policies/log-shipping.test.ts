import "@aws-cdk/assert/jest";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../../test/utils";
import { GuLogShippingPolicy } from "./log-shipping";

describe("The GuLogShippingPolicy class", () => {
  it("sets default props", () => {
    const stack = simpleGuStackForTesting();

    const logShippingPolicy = new GuLogShippingPolicy(stack, "LogShippingPolicy", { loggingStreamName: "test" });

    attachPolicyToTestRole(stack, logShippingPolicy);

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "log-shipping-policy",
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
                  ":stream/test",
                ],
              ],
            },
          },
        ],
      },
    });
  });

  it("merges defaults and passed in props", () => {
    const stack = simpleGuStackForTesting();

    const logShippingPolicy = new GuLogShippingPolicy(stack, "LogShippingPolicy", {
      loggingStreamName: "test",
      policyName: "test",
    });

    attachPolicyToTestRole(stack, logShippingPolicy);

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "test",
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
                  ":stream/test",
                ],
              ],
            },
          },
        ],
      },
    });
  });
});
