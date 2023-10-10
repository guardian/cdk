import { Template } from "aws-cdk-lib/assertions";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { GuRole } from "../../../../constructs/iam";
import { simpleGuStackForTesting } from "../../../../utils/test";
import { GuCrossAccountRoleExperimental } from "./cross-account-role";

describe("The GuCrossAccountRoleExperimental construct", () => {
  it("can create a cross account role", () => {
    const stack = simpleGuStackForTesting();
    new GuCrossAccountRoleExperimental(stack, "testCrossAccountRole", {
      nameOfRoleWhichCanAssumeThisRole: "nameOfRoleInOtherAccountWhichCanAssumeThis-STAGE",
      roleName: "crossAccountRole",
      accountId: "1234"
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("can create a cross account role that can be assumed by a service in another account", () => {
    const stackThatCreatesTheRole = simpleGuStackForTesting();
    new GuCrossAccountRoleExperimental(stackThatCreatesTheRole, "testCrossAccountRole", {
      nameOfRoleWhichCanAssumeThisRole: "nameOfRoleInOtherAccountWhichCanAssumeThisNewlyCreatedOne-CODE",
      roleName: "crossAccountRole",
      accountId: "1234"
    });

    Template.fromStack(stackThatCreatesTheRole).hasResourceProperties("AWS::IAM::Role", {
      RoleName: "crossAccountRole",
      AssumeRolePolicyDocument: {
        Statement: [{
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            AWS: "arn:aws:iam::1234:role/nameOfRoleInOtherAccountWhichCanAssumeThisNewlyCreatedOne-CODE"
          }
        }]
      }
    })

    const stackThatAssumesTheRole = simpleGuStackForTesting();
    new GuRole(stackThatAssumesTheRole, "idForRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      roleName: "nameOfRoleInOtherAccountWhichCanAssumeThisNewlyCreatedOne-CODE"
    });

    Template.fromStack(stackThatAssumesTheRole).hasResourceProperties("AWS::IAM::Role", {
      RoleName: "nameOfRoleInOtherAccountWhichCanAssumeThisNewlyCreatedOne-CODE",
      AssumeRolePolicyDocument: {
        Statement: [{
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "ec2.amazonaws.com"
          }
        }]
      }
    });
  })
});

