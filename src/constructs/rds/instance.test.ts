import "@aws-cdk/assert/jest";
import "../../utils/test/jest";
import { Vpc } from "@aws-cdk/aws-ec2";
import { DatabaseInstanceEngine, ParameterGroup, PostgresEngineVersion } from "@aws-cdk/aws-rds";
import { Stack } from "@aws-cdk/core";
import { TrackingTag } from "../../constants/tracking-tag";
import { alphabeticalTags, simpleGuStackForTesting } from "../../utils/test";
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

    expect(stack).toHaveResource("AWS::RDS::DBInstance", {
      DBInstanceClass: "db.t3.small",
    });
  });

  it("sets the parameter group if passed in", () => {
    const stack = simpleGuStackForTesting();

    const parameterGroup = new ParameterGroup(stack, "ParameterGroup", {
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

    expect(stack).toHaveResource("AWS::RDS::DBInstance", {
      DBParameterGroupName: {
        Ref: "ParameterGroup5E32DECB",
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

    expect(stack).toHaveResource("AWS::RDS::DBInstance", {
      DBParameterGroupName: {
        Ref: "DatabaseInstanceRDSParameterGroup307734CB",
      },
    });

    expect(stack).toHaveResource("AWS::RDS::DBParameterGroup", {
      Description: "Parameter group for postgres11",
      Family: "postgres11",
      Parameters: {
        max_connections: "100",
      },
      Tags: alphabeticalTags([
        {
          Key: "App",
          Value: "testing",
        },
        {
          Key: "Stack",
          Value: "test-stack",
        },
        {
          Key: "Stage",
          Value: {
            Ref: "Stage",
          },
        },
        TrackingTag,
      ]),
    });
  });

  it("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      existingLogicalId: "MyDb",
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      app: "testing",
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::RDS::DBInstance", "MyDb");
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

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::RDS::DBInstance", /^DatabaseInstance.+$/);
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

    expect(stack).toHaveResource("AWS::RDS::DBInstance", {
      DeletionProtection: true,
    });
  });
});
