import { AccountPrincipal, OrganizationPrincipal } from "@aws-cdk/aws-iam";
import type { TopicProps } from "@aws-cdk/aws-sns";
import { Topic } from "@aws-cdk/aws-sns";
import { RegexPattern } from "../../constants";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import type { GuStack } from "../core";
import type { GuMigratingResource } from "../core/migrating";

interface GuSnsTopicProps extends TopicProps, GuMigratingResource {
  /**
   * List of AWS account ids to grant `SNS:Publish` permission to.
   *
   * Note: if you need to add conditions to the Topic Policy, consider calling `this.grantPublish` directly.
   */
  accountsAllowedToPublish?: string[];

  /**
   * List of AWS organisations to grant `SNS:Publish` permission to.
   *
   * Note: if you need to add conditions to the Topic Policy, consider calling `this.grantPublish` directly.
   */
  organisationsAllowedToPublish?: string[];
}

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

    if (props) {
      const accountsAllowedToPublish = props.accountsAllowedToPublish ?? [];
      const accountIdRegex = new RegExp(RegexPattern.ACCOUNT_ID);

      accountsAllowedToPublish.forEach((accountId) => {
        if (!accountIdRegex.test(accountId)) {
          throw new Error(`${accountId} is not an account ID - should match ${RegexPattern.ACCOUNT_ID}`);
        }

        this.grantPublish(new AccountPrincipal(accountId));
      });

      const organisationsAllowedToPublish = props.organisationsAllowedToPublish ?? [];
      const organisationIdRegex = new RegExp(RegexPattern.ORGANISATION_ID);

      organisationsAllowedToPublish.forEach((orgId) => {
        if (!organisationIdRegex.test(orgId)) {
          throw new Error(`${orgId} is not an organisation ID - should match ${RegexPattern.ORGANISATION_ID}`);
        }

        this.grantPublish(new OrganizationPrincipal(orgId));
      });
    }
  }
}
