import { Topic } from "@aws-cdk/aws-sns";
import type { TopicProps } from "@aws-cdk/aws-sns";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import type { GuStack } from "../core";
import type { GuMigratingResource } from "../core/migrating";

interface GuSnsTopicProps extends TopicProps, GuMigratingResource {}

export class GuSnsTopic extends GuStatefulMigratableConstruct(Topic) {
  constructor(scope: GuStack, id: string, props?: GuSnsTopicProps) {
    super(scope, id, props);
  }
}
