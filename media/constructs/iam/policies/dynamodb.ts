import type { GuStack } from "../../core";
import { GuAllowPolicy } from "./base-policy";
import type { GuNoStatementsPolicyProps } from "./base-policy";

interface GuDynamoDBPolicyProps {
  tableName: string;
}

interface GuDynamoDBPolicyPropsWithActions extends GuNoStatementsPolicyProps, GuDynamoDBPolicyProps {
  actions: string[];
}

abstract class GuDynamoDBPolicy extends GuAllowPolicy {
  protected constructor(scope: GuStack, id: string, props: GuDynamoDBPolicyPropsWithActions) {
    super(scope, id, {
      ...props,
      actions: props.actions.map((action) => `dynamodb:${action}`),
      // Note: although the index resource is not supported for all attached actions
      // (e.g. BatchWriteItem), it will not cause issues to include it here as it is ignored.
      // See: https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html
      resources: [
        `arn:aws:dynamodb:${scope.region}:${scope.account}:table/${props.tableName}`,
        `arn:aws:dynamodb:${scope.region}:${scope.account}:table/${props.tableName}/index/*`,
      ],
    });
  }
}

export class GuDynamoDBReadPolicy extends GuDynamoDBPolicy {
  constructor(scope: GuStack, id: string, props: GuDynamoDBPolicyProps) {
    super(scope, id, { ...props, actions: ["BatchGetItem", "GetItem", "Scan", "Query", "GetRecords"] });
  }
}

export class GuDynamoDBWritePolicy extends GuDynamoDBPolicy {
  constructor(scope: GuStack, id: string, props: GuDynamoDBPolicyProps) {
    super(scope, id, { ...props, actions: ["BatchWriteItem", "PutItem", "DeleteItem", "UpdateItem"] });
  }
}
