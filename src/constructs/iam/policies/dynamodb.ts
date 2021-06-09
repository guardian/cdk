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
      resources: [`arn:aws:dynamodb:${scope.region}:${scope.account}:table/${props.tableName}`],
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
