import { Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { DatabaseInstanceEngine, ParameterGroup, PostgresEngineVersion } from "aws-cdk-lib/aws-rds";
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
    });

    Template.fromStack(stack).hasResourceProperties("AWS::RDS::DBInstance", {
      DBInstanceClass: "db.t3.small",
    });
  });

  it("sets the parameter group if passed in", () => {
    const stack = simpleGuStackForTesting();

    const parameterGroup = new ParameterGroup(stack, "MyParameterGroup", {
      parameters: { max_connections: "100" },
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
    });

    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      parameterGroup,
      app: "testing",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::RDS::DBInstance", {
      DBParameterGroupName: {
        Ref: Match.stringLikeRegexp("MyParameterGroup[A-Z0-9]+"),
      },
    });
  });

  it("creates a new parameter group if parameters are passed in", () => {
    const stack = simpleGuStackForTesting();
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      parameters: { max_connections: "100" },
      app: "testing",
    });

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::RDS::DBInstance", {
      DBParameterGroupName: {
        Ref: Match.stringLikeRegexp("DatabaseInstanceTestingParameterGroup[A-Z0-9]+"),
      },
    });

    template.hasResourceProperties("AWS::RDS::DBParameterGroup", {
      Description: "Parameter group for postgres11",
      Family: "postgres11",
      Parameters: {
        max_connections: "100",
      },
    });

    GuTemplate.fromStack(stack).hasGuTaggedResource("AWS::RDS::DBParameterGroup", {
      appIdentity: { app: "testing" },
    });
  });

  it("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      existingLogicalId: { logicalId: "MyDb", reason: "testing" },
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      app: "testing",
    });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::RDS::DBInstance", "MyDb");
  });

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      app: "testing",
    });

    const template = GuTemplate.fromStack(stack);

    template.hasResourceWithLogicalId("AWS::RDS::DBInstance", /^DatabaseInstance.+$/);
    template.hasGuTaggedResource("AWS::RDS::DBInstance", { appIdentity: { app: "testing" } });
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
    });

    Template.fromStack(stack).hasResourceProperties("AWS::RDS::DBInstance", {
      DeletionProtection: true,
    });
  });
});
