import "@aws-cdk/assert/jest";
import { attachPolicyToTestRole, simpleGuStackForTesting } from "../../../utils/test";
import { GuAssumeRolePolicy } from "./assume-role";

describe("The GuAssumeRolePolicy class", () => {
  it("sets default props", () => {
    const stack = simpleGuStackForTesting();

    const policy = new GuAssumeRolePolicy(stack, "GuAssumeRolePolicy", { resources: ["test"] });

    attachPolicyToTestRole(stack, policy);

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Resource: "test",
          },
        ],
      },
    });
  });

  it("merges defaults and passed in props", () => {
    const stack = simpleGuStackForTesting();

    const policy = new GuAssumeRolePolicy(stack, "GuAssumeRolePolicy", {
      resources: ["test"],
      policyName: "test-policy",
    });

    attachPolicyToTestRole(stack, policy);

    expect(stack).toHaveResource("AWS::IAM::Policy", {
      PolicyName: "test-policy",
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Resource: "test",
          },
        ],
      },
    });
  });
});
