import { Duration, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { DatabaseInstanceEngine, PostgresEngineVersion } from "aws-cdk-lib/aws-rds";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuDatabaseInstance } from "./instance";

describe("The GuDatabaseInstance class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: [""],
  });

  it("removes the db prefix from the instanceType prop (before CDK adds it back again)", () => {
    const stack = simpleGuStackForTesting();

    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      // When you pass an instanceType to the DatabaseInstance class, the db. prefix is added automagically
      // regardless of whether it exists already. The GuDatabaseInstance class contains some functionality
      // to remove this where it exists on the input value to ensure it doesn't get included twice
      instanceType: "db.t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      app: "testing",
      devXBackups: { enabled: true },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::RDS::DBInstance", {
      DBInstanceClass: "db.t3.small",
    });
  });

  test("sets the deletion protection value to true by default", () => {
    const stack = simpleGuStackForTesting();
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      app: "testing",
      devXBackups: { enabled: true },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::RDS::DBInstance", {
      DeletionProtection: true,
    });
  });

  test("sets DeleteAutomatedBackups to false by default", () => {
    const stack = simpleGuStackForTesting();
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_16,
      }),
      app: "testing",
      devXBackups: { enabled: true },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::RDS::DBInstance", {
      DeleteAutomatedBackups: false,
    });
  });

  test("adds the correct tag if the user opts-in to DevX Backups", () => {
    const stack = simpleGuStackForTesting();
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_16,
      }),
      app: "testing",
      devXBackups: { enabled: true },
    });

    GuTemplate.fromStack(stack).hasResourceWithTag("AWS::RDS::DBInstance", {
      Key: "devx-backup-enabled",
      Value: "true",
    });
  });

  test("adds the correct tag if the user opts-out of DevX Backups", () => {
    const stack = simpleGuStackForTesting();
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_16,
      }),
      app: "testing",
      devXBackups: {
        enabled: false,
        optOutReason: "This DB is never created in AWS, so it does not need backups.",
        backupRetention: Duration.days(30),
        preferredBackupWindow: "00:00-02:00",
      },
    });
    GuTemplate.fromStack(stack).hasResourceWithTag("AWS::RDS::DBInstance", {
      Key: "devx-backup-enabled",
      Value: "false",
    });
  });

  test("omits native RDS backup properties if the user opts-in to DevX Backups", () => {
    const stack = simpleGuStackForTesting();
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_16,
      }),
      app: "testing",
      devXBackups: { enabled: true },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::RDS::DBInstance", {
      // DevX Backups (AWS Backup) manages these properties, so they should always be omitted from CFN to avoid conflicts
      BackupRetentionPeriod: Match.absent(),
      PreferredBackupWindow: Match.absent(),
    });
  });

  test("correctly wires up native RDS backup properties if the user opts-out of DevX Backups", () => {
    const stack = simpleGuStackForTesting();
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_16,
      }),
      app: "testing",
      devXBackups: {
        enabled: false,
        optOutReason: "This DB is never created in AWS, so it does not need backups.",
        backupRetention: Duration.days(30),
        preferredBackupWindow: "00:00-02:00",
      },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::RDS::DBInstance", {
      BackupRetentionPeriod: 30,
      PreferredBackupWindow: "00:00-02:00",
    });
  });
});
