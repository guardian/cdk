import { Fn, Tags } from "aws-cdk-lib";
import { InstanceType } from "aws-cdk-lib/aws-ec2";
import { DatabaseInstance, StorageType } from "aws-cdk-lib/aws-rds";
import type { DatabaseInstanceProps } from "aws-cdk-lib/aws-rds";
import { GuAppAwareConstruct } from "../../utils/mixin/app-aware-construct";
import type { AppIdentity, GuStack } from "../core";

export interface OptIn {
  enabled: true;
}

// Using Pick here means that we get the AWS documentation for these properties rather than needing to define it ourselves
export interface OptOut extends Pick<DatabaseInstanceProps, "backupRetention" | "preferredBackupWindow"> {
  enabled: false;
  /**
   * We recommend using DevX Backups where possible. If it is not suitable for your use-case please document
   * this here so that we can understand why this is switched off when performing security audits.
   */
  optOutReason: string;
}

export interface GuDatabaseInstanceProps
  extends Omit<DatabaseInstanceProps, "instanceType" | "backupRetention" | "preferredBackupWindow">,
    AppIdentity {
  instanceType: string;
  /**
   * We recommend using DevX Backups to protect your RDS instance's backups.
   * For more details on this feature, see the
   * [documentation](https://docs.google.com/document/d/1VDCSxYFlWs4R6g0Waa6OmmfytV60AROyHxfIGho7cLA/edit#heading=h.vwt7syo8ng40).
   */
  devXBackups: OptIn | OptOut;
}

export class GuDatabaseInstance extends GuAppAwareConstruct(DatabaseInstance) {
  constructor(scope: GuStack, id: string, props: GuDatabaseInstanceProps) {
    // CDK just wants "t3.micro" format, whereas
    // some CFN yaml might have the older "db.t3.micro" with the "db." prefix
    // This logic ensures the "db." prefix is removed before applying the CFN
    const instanceType = new InstanceType(Fn.join("", Fn.split("db.", props.instanceType)));

    super(scope, id, {
      storageType: StorageType.GP3,
      deletionProtection: true,
      deleteAutomatedBackups: false,
      backupRetention: props.devXBackups.enabled ? undefined : props.devXBackups.backupRetention,
      preferredBackupWindow: props.devXBackups.enabled ? undefined : props.devXBackups.preferredBackupWindow,
      ...props,
      instanceType,
    });
    Tags.of(this).add("devx-backup-enabled", String(props.devXBackups.enabled));
  }
}
