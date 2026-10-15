import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuRepository } from "./repository";

describe("GuRepository", () => {
  test("should import a repository with the correct ARN", () => {
    const stack = simpleGuStackForTesting();

    const repository = new GuRepository(stack, "GuRepository", {
      name: "guardian/test/app",
    });

    const template = Template.fromStack(stack);

    // Assert GuRepository is using the GuArtifactsAccountId singleton
    template.hasParameter("ArtifactsAccountId", {
      Type: "AWS::SSM::Parameter::Value<String>",
      Default: "/organisation/accounts/artifacts",
      Description: "Account ID of the Artifacts account. Useful as some shared resources live here.",
    });

    expect(repository.repositoryName).toBe("guardian/test/app");
    expect(stack.resolve(repository.repositoryArn)).toStrictEqual({
      "Fn::Join": [
        "",
        [
          "arn:",
          { Ref: "AWS::Partition" },
          ":ecr:eu-west-1:",
          { Ref: "ArtifactsAccountId" },
          ":repository/guardian/test/app",
        ],
      ],
    });
  });
});
