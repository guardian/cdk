import type { TopicProps } from "aws-cdk-lib/aws-sns";
import { Topic } from "aws-cdk-lib/aws-sns";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import type { GuMigratingResource, GuStack } from "../core";

interface GuSnsTopicProps extends TopicProps, GuMigratingResource {}

/**
 * Construct which creates an SNS Topic.
 *
 * To inherit an SNS topic which has already been created via a CloudFormation stack, the `migratedFromCloudFormation`
 * prop on your stack must be set to `true`. You should also pass in the logical id via the `existingLogicalId` prop.
 *
 * For example, when migrating a CloudFormation stack which includes the following resource:
 * ```yaml
 * MyCloudFormedSnsTopic:
 *   Type: AWS::SNS::Topic
 * ```
 * Inherit the SNS topic (rather than creating a new one) using:
 * ```typescript
 *  new GuSnsTopic(stack, "SnsTopic", { existingLogicalId: "MyCloudFormedSnsTopic" });
 * ```
 */
export class GuSnsTopic extends GuStatefulMigratableConstruct(Topic) {
  constructor(scope: GuStack, id: string, props?: GuSnsTopicProps) {
    super(scope, id, props);
  }
}
