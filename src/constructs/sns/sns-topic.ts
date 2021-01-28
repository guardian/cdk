import { Topic } from "@aws-cdk/aws-sns";
import type { CfnTopic, TopicProps } from "@aws-cdk/aws-sns";
import type { GuStack } from "../core";

interface GuSnsTopicProps extends TopicProps {
  overrideId?: boolean;
}

export class GuSnsTopic extends Topic {
  constructor(scope: GuStack, id: string, props?: GuSnsTopicProps) {
    super(scope, id, props);
    const cfnSnsTopic = this.node.defaultChild as CfnTopic;
    if (props?.overrideId) cfnSnsTopic.overrideLogicalId(id);
  }
}
