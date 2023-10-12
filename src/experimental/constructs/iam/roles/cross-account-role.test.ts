import { Template } from "aws-cdk-lib/assertions";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { GuRole } from "../../../../constructs/iam";
import { simpleGuStackForTesting } from "../../../../utils/test";
import { GuCrossAccountRoleExperimental } from "./cross-account-role";

describe("The GuCrossAccountRoleExperimental construct", () => {
  it("can create a cross account role", () => {
    const stack = simpleGuStackForTesting();
    new GuCrossAccountRoleExperimental(stack, "testCrossAccountRole", {
      nameOfRoleWhichCanAssumeThisRole: "nameOfRoleInOtherAccountWhichCanAssumeThis-STAGE",
      roleName: "crossAccountRole",
      accountId: "1234",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("can create a cross account role that can be assumed by a service in another account", () => {
    const stackInAccountB = simpleGuStackForTesting();
    const crossAccountRole = new GuCrossAccountRoleExperimental(stackInAccountB, "testCrossAccountRole", {
      nameOfRoleWhichCanAssumeThisRole: "roleInAccountA-CODE",
      roleName: "roleInAccountB-CODE",
      accountId: "idForAccountA",
    });

    // This is just an example: after creating the cross account role we can add policies which allow the role in
    // the other account to perform the given actions in this account.
    crossAccountRole.addToPolicy(
      new PolicyStatement({
        actions: ["sqs:SendMessage"],
        resources: ["queue.queueArn"],
      }),
    );

    Template.fromStack(stackInAccountB).hasResourceProperties("AWS::IAM::Role", {
      RoleName: "roleInAccountB-CODE",
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
              AWS: "arn:aws:iam::idForAccountA:role/roleInAccountA-CODE",
            },
          },
        ],
      },
    });

    const stackInAccountA = simpleGuStackForTesting();
    const role = new GuRole(stackInAccountA, "idForRole", {
      // This corresponds to the AWS service that our app will be running in, ec2 is just an example, it could be
      // any service (e.g. lambda.amazonaws.com).
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      roleName: "roleInAccountA-CODE",
    });

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: ["arn:aws:iam::idForAccountB:role/roleInAccountB-CODE"],
      }),
    );

    Template.fromStack(stackInAccountA).hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [
          {
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Resource: "arn:aws:iam::idForAccountB:role/roleInAccountB-CODE",
          },
        ],
      },
    });
  });
});
