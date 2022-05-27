import { Fn } from "aws-cdk-lib";
import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { DatabaseInstance } from "aws-cdk-lib/aws-rds";
import type { DatabaseInstanceProps } from "aws-cdk-lib/aws-rds";
import type { GuApp } from "../core";

export interface GuDatabaseInstanceProps extends Omit<DatabaseInstanceProps, "instanceType"> {
  instanceType: string;
}

export class GuDatabaseInstance extends DatabaseInstance {
  constructor(scope: GuApp, id: string, props: GuDatabaseInstanceProps) {
    // CDK just wants "t3.micro" format, whereas
    // some CFN yaml might have the older "db.t3.micro" with the "db." prefix
    // This logic ensures the "db." prefix is removed before applying the CFN
    const instanceType = new InstanceType(Fn.join("", Fn.split("db.", props.instanceType)));

    super(scope, id, {
      deletionProtection: true,
      ...props,
      instanceType,
    });
  }
}
