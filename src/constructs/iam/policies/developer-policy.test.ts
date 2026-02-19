import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuDeveloperPolicy } from "./developer-policy";

describe("GuDeveloperPolicy", () => {
  test("if a single action is provided, the resulting Developer Policy resource's statement will have a single item", () => {
    const stack = simpleGuStackForTesting();
    new GuDeveloperPolicy(stack, "AllowS3GetObject", {
      allow: {
        actions: ["s3:GetObject"],
        resources: ["*"],
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::ManagedPolicy", {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "s3:GetObject",
            Effect: "Allow",
            Resource: "*",
          },
        ],
      },
    });
  });
});
