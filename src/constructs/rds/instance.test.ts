import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { Vpc } from "@aws-cdk/aws-ec2";
import { DatabaseInstanceEngine, ParameterGroup, PostgresEngineVersion } from "@aws-cdk/aws-rds";
import { Stack } from "@aws-cdk/core";
import { alphabeticalTags, simpleGuStackForTesting } from "../../../test/utils";
import type { SynthedStack } from "../../../test/utils";
import { TrackingTag } from "../../constants/library-info";
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

  it("overrides the id if the prop is true", () => {
    const stack = simpleGuStackForTesting();
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      overrideId: true,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      app: "testing",
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).toContain("DatabaseInstance");
  });

  it("does not override the id if the prop is false", () => {
    const stack = simpleGuStackForTesting();
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      app: "testing",
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).not.toContain("DatabaseInstance");
  });

  it("overrides the id if the stack migrated value is true", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      app: "testing",
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).toContain("DatabaseInstance");
  });

  it("does not override the id if the stack migrated value is true but the override id value is false", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      overrideId: false,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      app: "testing",
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).not.toContain("DatabaseInstance");
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
