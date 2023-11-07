import { App, Tags } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { DatabaseInstance, DatabaseInstanceEngine } from "aws-cdk-lib/aws-rds";
import { GuStack } from "../constructs/core";
import { GuTemplate } from "../utils/test";

describe("AwsBackupTag aspect", () => {
  it("should add the 'devx-backup-enabled' tag as 'true' when backups are enabled", () => {
    const app = new App();
    const stack = new GuStack(app, "Test", { stack: "test", stage: "TEST", withBackup: true });

    const vpc = new Vpc(stack, "TestVpc");
    new DatabaseInstance(stack, "MyDatabase", { engine: DatabaseInstanceEngine.POSTGRES, vpc });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::RDS::DBInstance", {
      additionalTags: [
        {
          Key: "devx-backup-enabled",
          Value: "true",
        },
      ],
    });
  });

  it("should allow the 'devx-backup-enabled' tag to be overridden", () => {
    const app = new App();
    const stack = new GuStack(app, "Test", {
      stack: "test",
      stage: "TEST",
      withBackup: true, // enable backups on all resources in this stack
    });

    const vpc = new Vpc(stack, "TestVpc");
    const database = new DatabaseInstance(stack, "MyDatabase", { engine: DatabaseInstanceEngine.POSTGRES, vpc });

    // Disable backups on this one resource
    Tags.of(database).add("devx-backup-enabled", "false");

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::RDS::DBInstance", {
      additionalTags: [
        {
          Key: "devx-backup-enabled",
          Value: "false",
        },
      ],
    });
  });
});
