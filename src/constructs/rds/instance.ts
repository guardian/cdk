import { InstanceType } from "@aws-cdk/aws-ec2";
import type { CfnDBInstance, DatabaseInstanceProps, IParameterGroup } from "@aws-cdk/aws-rds";
import { DatabaseInstance, ParameterGroup } from "@aws-cdk/aws-rds";
import { Fn } from "@aws-cdk/core";
import type { GuStack } from "../core";

export interface GuDatabaseInstanceProps extends Omit<DatabaseInstanceProps, "instanceType"> {
  overrideId?: boolean;
  instanceType: string;
  parameters?: Record<string, string>;
}

export class GuDatabaseInstance extends DatabaseInstance {
  constructor(scope: GuStack, id: string, props: GuDatabaseInstanceProps) {
    // CDK just wants "t3.micro" format, whereas
    // some CFN yaml might have the older "db.t3.micro" with the "db." prefix
    // This logic ensures the "db." prefix is removed before applying the CFN
    const instanceType = new InstanceType(Fn.join("", Fn.split("db.", props.instanceType)));

    let parameterGroup: IParameterGroup | undefined;
    if (props.parameterGroup) {
      parameterGroup = props.parameterGroup;
    } else if (props.parameters) {
      parameterGroup = new ParameterGroup(scope, `${id}-RDSParameterGroup`, {
        engine: props.engine,
        parameters: props.parameters,
      });
    }

    super(scope, id, {
      deletionProtection: true,
      ...props,
      instanceType,
      ...(parameterGroup && { parameterGroup }),
    });

    if (props.overrideId || (scope.migrated && props.overrideId !== false)) {
      (this.node.defaultChild as CfnDBInstance).overrideLogicalId(id);
    }
  }
}
