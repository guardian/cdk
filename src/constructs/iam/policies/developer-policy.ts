import type { IAspect } from "aws-cdk-lib";
import { Annotations, Aspects } from "aws-cdk-lib";
import { Effect, type PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CfnManagedPolicy, ManagedPolicy } from "aws-cdk-lib/aws-iam";
import type { IConstruct } from "constructs";
import type { GuStack } from "../../core";

export type GuDeveloperPolicyProps = {
  /**
   * IAM policy statements to include in the developer policy.
   *
   * At least one statement is required.
   */
  readonly statements: [PolicyStatement, ...PolicyStatement[]];
  /**
   * Unique identifier of the developer policy grant.
   * This must match the grant ID used in Janus DeveloperPolicyGrant!
   */
  readonly grantId: string;
  /**
   * The managed policy description is also used as a
   * friendly display name for the policy in Janus.
   *
   * Keep this short so it fits on a single line in the Janus UI.
   */
  readonly description: string;
};

/**
 * Creates a structured `AWS::IAM::ManagedPolicy` used by Janus developer policy grants.
 * The policy should have the least permissions required to carry out
 * a particular task or workflow.
 *
 * Example:
 * ```ts
 * new GuDeveloperPolicy(stack, "ReadLogsPolicy", {
 *   grantId: "read-logs-support",
 *   description: "Read logs for Support tooling",
 *   statements: [
 *     new PolicyStatement({
 *       effect: Effect.ALLOW,
 *       actions: ["logs:GetLogEvents"],
 *       resources: ["arn:aws:logs:eu-west-1:123456789012:log-group:/aws/lambda/my-app:*"],
 *     }),
 *     new PolicyStatement({
 *       effect: Effect.DENY,
 *       actions: ["logs:GetLogEvents"],
 *       resources: ["arn:aws:logs:eu-west-1:123456789012:log-group:/aws/lambda/my-app:log-stream:secret*"],
 *     }),
 *   ],
 * });
 * ```
 */
export class GuDeveloperPolicy extends ManagedPolicy {
  constructor(scope: GuStack, id: string, props: GuDeveloperPolicyProps) {
    super(scope, id, {
      ...props,
      path: `/developer-policy/${props.grantId}/`,
    });

    // Later, apply to the stack and check for specific errors
    Aspects.of(this).add(new GuDeveloperPolicyChecker());
  }
}

class GuDeveloperPolicyChecker implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof CfnManagedPolicy) {
      const policyDocumentJson = this.getPolicyDocumentJson(node.policyDocument as unknown);

      // These conditions will result in failures from the AWS classes themselves, so we don't need to validate them.
      if (policyDocumentJson === null || typeof policyDocumentJson !== "object") {
        return;
      }
      if (!("Statement" in policyDocumentJson)) {
        Annotations.of(node).addError("Policy document must include at least one Statement");
        return;
      }
      if (!Array.isArray(policyDocumentJson.Statement)) {
        Annotations.of(node).addError("Policy document Statement must be an array");
        return;
      }
      if (policyDocumentJson.Statement.length === 0) {
        Annotations.of(node).addError("Policy document must include at least one Statement");
        return;
      }

      // For the following conditions, we want to make a strong assertions: you cannot "Allow" with wildcards.
      for (const statement of policyDocumentJson.Statement) {
        if (statement === null || typeof statement !== "object") {
          Annotations.of(node).addError("Statement must be an object");
          continue;
        }

        if (!("Effect" in statement) || (statement as { Effect: unknown }).Effect === Effect.ALLOW) {
          if (!("Action" in statement)) {
            Annotations.of(node).addError("Statement is missing an Action");
          } else {
            const action = (statement as { Action: unknown }).Action;

            if (typeof action === "string") {
              this.checkAction(action, node);
            } else if (Array.isArray(action)) {
              const actionArray = action as string[];
              actionArray.forEach((action) => this.checkAction(action, node));
            }
          }

          if (!("Resource" in statement)) {
            Annotations.of(node).addError("Statement is missing an Resource");
          } else {
            const resource = (statement as { Resource: unknown }).Resource;

            if (typeof resource === "string") {
              this.checkResource(resource, node);
            } else if (Array.isArray(resource)) {
              const resourceArray = resource as string[];
              resourceArray.forEach((resource) => {
                this.checkResource(resource, node);
              });
            }
          }
        }
      }
    }
  }

  private getPolicyDocumentJson(policyDocument: unknown): unknown {
    if (
      policyDocument !== null &&
      typeof policyDocument === "object" &&
      "toJSON" in policyDocument &&
      typeof (policyDocument as { toJSON?: unknown }).toJSON === "function"
    ) {
      return (policyDocument as { toJSON: () => unknown }).toJSON();
    }

    return policyDocument;
  }

  /**
   * Ensure that we don't have either actions or resources of the following forms:
   *
   *   *
   *   s3:*
   *   arn:aws:dynamodb:us-east-2:account-ID-without-hyphens:table/*
   *   arn:aws:s3:::*
   *
   * @param checkString Action or resource value to validate.
   * @param checkType Label used in validation error messages (for example, Action or Resource).
   * @param node Policy node used to attach validation annotations.
   * @private
   */
  private check(checkString: string, checkType: string, node: CfnManagedPolicy) {
    if (checkString === "*" || checkString.indexOf(":*") || checkString.indexOf("/*") > 0) {
      Annotations.of(node).addError(`Statement ${checkType} is too broad: ${checkString}`);
    }
  }
  private checkAction(checkString: string, node: CfnManagedPolicy) {
    this.check(checkString, "Action", node);
  }
  private checkResource(checkString: string, node: CfnManagedPolicy) {
    this.check(checkString, "Resource", node);
  }
}
