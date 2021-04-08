import { Topic } from "@aws-cdk/aws-sns";
import type { TopicProps } from "@aws-cdk/aws-sns";
import type { GuStack } from "../core";
import { GuMigratingResource } from "../core/migrating";

interface GuSnsTopicProps extends TopicProps, GuMigratingResource {}

export class GuSnsTopic extends Topic {
  constructor(scope: GuStack, id: string, props?: GuSnsTopicProps) {
    super(scope, id, props);
    props && GuMigratingResource.setLogicalId(this, scope, props);
  }
}
