import { Template } from "aws-cdk-lib/assertions";
import { Cluster } from "aws-cdk-lib/aws-ecs";
import { simpleGuStackForTesting } from "../../../../utils/test";
import { GuECSManagedInstanceRoleExperimental } from "./ecs-managed-instances";

describe("GuECSManagedInstanceRole", () => {
  it("matches snapshot of the generated CloudFormation template", () => {
    const stack = simpleGuStackForTesting();
    const cluster = Cluster.fromClusterArn(
      stack,
      "testcluster",
      "arn:aws:ecs:eu-west-1:123456789012:cluster/test-cluster",
    );

    new GuECSManagedInstanceRoleExperimental(stack, "ECSInstanceRole", {
      cluster,
    });

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("creates a role that can be assumed by EC2", () => {
    const stack = simpleGuStackForTesting();
    const cluster = Cluster.fromClusterArn(
      stack,
      "testcluster",
      "arn:aws:ecs:eu-west-1:123456789012:cluster/test-cluster",
    );

    new GuECSManagedInstanceRoleExperimental(stack, "ECSInstanceRole", {
      cluster,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              Service: "ec2.amazonaws.com",
            },
          },
        ],
      },
    });
  });

  it("attaches the ECS managed policy for registry access", () => {
    const stack = simpleGuStackForTesting();
    const cluster = Cluster.fromClusterArn(
      stack,
      "testcluster",
      "arn:aws:ecs:eu-west-1:123456789012:cluster/test-cluster",
    );

    new GuECSManagedInstanceRoleExperimental(stack, "ECSInstanceRole", {
      cluster,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::IAM::Role", {
      ManagedPolicyArns: ["arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"],
    });
  });
});
