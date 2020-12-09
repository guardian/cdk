import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert/lib/synth-utils";
import { Vpc } from "@aws-cdk/aws-ec2";
import { DatabaseInstanceEngine, ParameterGroup, PostgresEngineVersion } from "@aws-cdk/aws-rds";
import { App, Stack } from "@aws-cdk/core";
import type { SynthedStack } from "../../../test/utils/synthed-stack";
import { GuStack } from "../core";
import { GuDatabaseInstance } from "./instance";

describe("The GuDatabaseInstance class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: [""],
  });

  it("removes the db prefix from the input instance type", () => {
    const app = new App();
    const stack = new GuStack(app);

    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "db.t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
    });

    expect(stack).toHaveResource("AWS::RDS::DBInstance", {
      DBInstanceClass: "db.t3.small",
    });
  });

  it("sets the parameter group if passed in", () => {
    const app = new App();
    const stack = new GuStack(app);

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
    });

    expect(stack).toHaveResource("AWS::RDS::DBInstance", {
      DBParameterGroupName: {
        Ref: "ParameterGroup5E32DECB",
      },
    });
  });

  it("creates a new parameter group if parameters are passed in", () => {
    const app = new App();
    const stack = new GuStack(app);
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
      parameters: { max_connections: "100" },
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
      Tags: [
        {
          Key: "Stack",
          Value: {
            Ref: "Stack",
          },
        },
        {
          Key: "Stage",
          Value: {
            Ref: "Stage",
          },
        },
      ],
    });
  });

  it("overrides the id if the prop is true", () => {
    const app = new App();
    const stack = new GuStack(app);
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      overrideId: true,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).toContain("DatabaseInstance");
  });

  it("does not override the id if the prop is false", () => {
    const app = new App();
    const stack = new GuStack(app);
    new GuDatabaseInstance(stack, "DatabaseInstance", {
      vpc,
      instanceType: "t3.small",
      engine: DatabaseInstanceEngine.postgres({
        version: PostgresEngineVersion.VER_11_8,
      }),
    });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Object.keys(json.Resources)).not.toContain("DatabaseInstance");
  });
});
