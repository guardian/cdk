import type { IAspect } from "aws-cdk-lib";
import { CfnResource, TagManager } from "aws-cdk-lib";
import type { IConstruct } from "constructs";

/**
 * Applies the tags that enable backups for supported resources.
 *
 * @see https://github.com/guardian/aws-backup
 */
export class AwsBackupTag implements IAspect {
  /**
   * These resources are backed up by https://github.com/guardian/aws-backup.
   */
  static resourceTypes: string[] = ["AWS::RDS::DBInstance", "AWS::DynamoDB::Table"];

  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      const { cfnResourceType } = node;

      if (AwsBackupTag.resourceTypes.includes(cfnResourceType) && TagManager.isTaggable(node)) {
        node.tags.setTag("devx-backup-enabled", "true");
      }
    }
  }
}
