import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import type { SynthedStack } from "../../../../test/utils";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../../test/utils";
import { GuLogShippingPolicy } from "./log-shipping";

describe("The GuLogShippingPolicy class", () => {
  it("creates a policy restricted to a kinesis stream defined in a parameter", () => {
    const stack = simpleGuStackForTesting();

    const logShippingPolicy = new GuLogShippingPolicy(stack);
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
});
