import { Template } from "aws-cdk-lib/assertions";
import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuDynamoTable } from "./dynamodb";

describe("The GUDynamoTable class", () => {
  const partitionKey = {
    name: "partitionKey",
    type: AttributeType.STRING,
  };

  test("adds the correct tag if the user opts-in to DevX Backups", () => {
    const stack = simpleGuStackForTesting();
    new GuDynamoTable(stack, "OptInDynamoDB", {
      partitionKey: partitionKey,
      devXBackups: { enabled: true },
    });

    GuTemplate.fromStack(stack).hasResourceWithTag("AWS::DynamoDB::Table", {
      Key: "devx-backup-enabled",
      Value: "true",
    });
  });

  test("adds the correct tag if the user opts-out of DevX Backups", () => {
    const stack = simpleGuStackForTesting();
    new GuDynamoTable(stack, "OptOutDynamoDB", {
      partitionKey: partitionKey,
      devXBackups: { enabled: false, optOutReason: "Test opt-out reason" },
    });

    GuTemplate.fromStack(stack).hasResourceWithTag("AWS::DynamoDB::Table", {
      Key: "devx-backup-enabled",
      Value: "false",
    });
  });

  test("adds 'DeletionProtectionEnabled: true' by default to DynamoDB Table", () => {
    const stack = simpleGuStackForTesting();
    new GuDynamoTable(stack, "OptOutReasonDynamoDB", {
      partitionKey: partitionKey,
      devXBackups: { enabled: false, optOutReason: "Test opt-out reason" },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::DynamoDB::Table", {
      DeletionProtectionEnabled: true,
    });
  });

  test("DeletionProtectionEnabled can be set to false by user", () => {
    const stack = simpleGuStackForTesting();
    new GuDynamoTable(stack, "OptOutReasonDynamoDB", {
      partitionKey: partitionKey,
      deletionProtection: false,
      devXBackups: { enabled: false, optOutReason: "Test opt-out reason" },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::DynamoDB::Table", {
      DeletionProtectionEnabled: false,
    });
  });
});
