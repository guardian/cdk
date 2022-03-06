import { Template } from "aws-cdk-lib/assertions";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuLogShippingPolicy } from "./log-shipping";

describe("The GuLogShippingPolicy singleton class", () => {
  it("creates a policy restricted to a kinesis stream defined in a parameter", () => {
    const stack = simpleGuStackForTesting();

    const logShippingPolicy = GuLogShippingPolicy.getInstance(stack);
    attachPolicyToTestRole(stack, logShippingPolicy);

    const template = Template.fromStack(stack);

    template.hasParameter("LoggingStreamName", {
      Type: "AWS::SSM::Parameter::Value<String>",
      Default: "/account/services/logging.stream.name",
      Description: "SSM parameter containing the Name (not ARN) on the kinesis stream",
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
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

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::IAM::Policy", 1);
    template.resourceCountIs("AWS::IAM::Role", 2);
    expect(template.toJSON()).toMatchSnapshot();
  });

  it("works across multiple stacks", () => {
    const stack1 = simpleGuStackForTesting();
    const stack2 = simpleGuStackForTesting();

    const logShippingPolicy1 = GuLogShippingPolicy.getInstance(stack1);
    const logShippingPolicy2 = GuLogShippingPolicy.getInstance(stack2);

    attachPolicyToTestRole(stack1, logShippingPolicy1);
    attachPolicyToTestRole(stack2, logShippingPolicy2);

    const template1 = Template.fromStack(stack1);
    template1.resourceCountIs("AWS::IAM::Policy", 1);
    template1.resourceCountIs("AWS::IAM::Role", 1);

    const template2 = Template.fromStack(stack2);
    template2.resourceCountIs("AWS::IAM::Policy", 1);
    template2.resourceCountIs("AWS::IAM::Role", 1);
  });
});
