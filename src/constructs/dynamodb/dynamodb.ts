import { Tags } from "aws-cdk-lib";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import type { TableProps } from "aws-cdk-lib/aws-dynamodb";
import type { GuStack } from "../core";

export interface OptIn {
  enabled: true;
}

export interface OptOut {
  enabled: false;
  /**
   * We recommend using DevX Backups where possible. If it is not suitable for your use-case please document
   * this here so that we can understand why this is switched off when performing security audits.
   */
  optOutReason: string;
}

export interface GuDynamoTableProps extends TableProps {
  /**
   * We recommend using DevX Backups to protect your DynamoDB table's backups.
   * For more details on this feature, see the
   * [documentation](https://docs.google.com/document/d/11EZtuVHCnjavE9AYLroiuDUsMzbp2ulFBtj4VkyCKNc/edit?usp=sharing).
   */
  devXBackups: OptIn | OptOut;
}

  /**
   * DeletionProtection is enabled by default for this Table.
   * We recommend enabling this enabled for all active DynamoDB tables.
   * The default can be overridden in the GuDynamoTable instantiation if needed eg: for table deletion.
   */
  export class GuDynamoTable extends Table {

  constructor(scope: GuStack, id: string, props: GuDynamoTableProps) {
    super(scope, id, { deletionProtection: true, ...props });
    Tags.of(this).add("devx-backup-enabled", String(props.devXBackups.enabled));
  }
}
