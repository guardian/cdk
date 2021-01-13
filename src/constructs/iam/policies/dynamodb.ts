import type { GuStack } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuAllowPolicy } from "./base-policy";

interface GuDynamoDBPolicyProps {
  tableName: string;
}

interface GuDynamoDBPolicyPropsWithActions extends GuPolicyProps, GuDynamoDBPolicyProps {
  actions: string[];
}

abstract class GuDynamoDBPolicy extends GuAllowPolicy {
  protected constructor(scope: GuStack, id: string, props: GuDynamoDBPolicyPropsWithActions) {
    super(scope, id, {
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
