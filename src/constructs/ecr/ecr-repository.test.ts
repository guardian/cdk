import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuEcrRepository } from "./ecr-repository";

describe("The GuEcrRepository construct", () => {
  it("should create an ECR repository", () => {
    const stack = simpleGuStackForTesting();
    new GuEcrRepository(stack, "MyRepository", {
      repository: `guardian@111111/my-repo@222222`,
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::ECR::Repository", {
      EmptyOnDelete: false,
      ImageScanningConfiguration: { ScanOnPush: true },
      ImageTagMutability: "IMMUTABLE_WITH_EXCLUSION",
      RepositoryName: "guardian/my-repo/my-repo",
    });

    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringLike: {
                "token.actions.githubusercontent.com:sub": "repo:guardian@111111/my-repo@222222:*",
              },
            },
          },
        ],
      },
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Effect: "Allow",
            Action: [
              "ecr:CompleteLayerUpload",
              "ecr:UploadLayerPart",
              "ecr:InitiateLayerUpload",
              "ecr:BatchCheckLayerAvailability",
              "ecr:PutImage",
            ],
          },
          {
            Effect: "Allow",
            Action: "ecr:GetAuthorizationToken",
            Resource: "*",
          },
        ],
      },
    });

    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Effect: "Allow",
            Action: ["ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"],
            Resource: "*",
          },
        ],
      },
    });
  });

  it("should support multiple GuEcrRepository constructs in the same stack", () => {
    const stack = simpleGuStackForTesting();
    new GuEcrRepository(stack, "FirstRepository", {
      repository: `guardian@111111/first-repo@222222`,
    });
    new GuEcrRepository(stack, "SecondRepository", {
      repository: `guardian@333333/second-repo@44444`,
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs("AWS::ECR::Repository", 2);
    template.resourceCountIs("AWS::IAM::Role", 2);
  });
});
