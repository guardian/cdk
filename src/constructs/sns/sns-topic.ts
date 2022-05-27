import { Topic } from "aws-cdk-lib/aws-sns";
import type { TopicProps } from "aws-cdk-lib/aws-sns";
import type { GuApp } from "../core";

type GuSnsTopicProps = TopicProps;

/**
 * Construct which creates an SNS Topic.
 *
 * This resource is stateful.
 * @see https://github.com/guardian/cdk/blob/main/docs/stateful-resources.md
 */
export class GuSnsTopic extends Topic {
  constructor(scope: GuApp, id: string, props?: GuSnsTopicProps) {
    super(scope, id, props);
  }
}
