import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
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
  static buildStatements(scope: GuStack, tableName: string): PolicyStatement[] {
    return [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["dynamodb:BatchGetItem", "dynamodb:GetItem", "dynamodb:Scan", "dynamodb:Query", "dynamodb:GetRecords"],
        resources: [
          `arn:aws:dynamodb:${scope.region}:${scope.account}:table/${tableName}`,
          `arn:aws:dynamodb:${scope.region}:${scope.account}:table/${tableName}/index/*`,
        ],
      }),
    ];
  }

  constructor(scope: GuStack, id: string, props: GuDynamoDBPolicyProps) {
    super(scope, id, { ...props, actions: ["BatchGetItem", "GetItem", "Scan", "Query", "GetRecords"] });
  }
}

export class GuDynamoDBWritePolicy extends GuDynamoDBPolicy {
  static buildStatements(scope: GuStack, tableName: string): PolicyStatement[] {
    return [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["dynamodb:BatchWriteItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:UpdateItem"],
        resources: [
          `arn:aws:dynamodb:${scope.region}:${scope.account}:table/${tableName}`,
          `arn:aws:dynamodb:${scope.region}:${scope.account}:table/${tableName}/index/*`,
        ],
      }),
    ];
  }

  constructor(scope: GuStack, id: string, props: GuDynamoDBPolicyProps) {
    super(scope, id, { ...props, actions: ["BatchWriteItem", "PutItem", "DeleteItem", "UpdateItem"] });
  }
}
