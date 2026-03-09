import type { IAspect } from "aws-cdk-lib";
import { Annotations, Aspects } from "aws-cdk-lib";
import type { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CfnManagedPolicy, ManagedPolicy, type PolicyDocument } from "aws-cdk-lib/aws-iam";
import type { IConstruct } from "constructs";
import type { GuStack } from "../../../../constructs/core";

export type GuWorkloadPolicyProps = {
  /**
   * Initial set of permissions to add to this policy document.
   * You can also use `addPermission(statement)` to add permissions later.
   *
   * @default - No statements.
   */
  readonly statements?: PolicyStatement[];
  /**
   * The unique identifier of the policy, which will be displayed when creating credentials.
   */
  readonly permission: string;
  /**
   * An optional description of the policy which will be displayed if present.
   */
  readonly description?: string;
};

/**
 * Creates a structured `AWS::IAM::ManagedPolicy` resource to manage arbitrary permissions on general account
 * resources which can then be used to create limited permission credentials for use with specific activities.
 *
 * The permission scope is not controlled.  This class should be used with care to create minimal permissions.
 * To that end, broad ALLOW permissions can pruned with narrower optional DENY permissions.
 *
 * `permission` is prefixed with `/developer-policy/` and postfixed with `/` to construct the path.  This will
 * be used for discovery and display.  It is restricted to the same character set as AWS `path`.
 *
 * `description` is optionally used to construct the AWS Managed Policy description and used for display.
 *
 * ```yaml
 *  TestingECAE2E87:
 *     Type: AWS::IAM::ManagedPolicy
 *     Properties:
 *       Description: This is testing stuff
 *       Path: /developer-policy/read-from-mybucket-under-mypath/
 *       PolicyDocument:
 *         Statement:
 *           - Action: s3:GetObject
 *             Effect: Allow
 *             Resource: arn:aws:s3:::mybucket/mypath
 *           - Action: s3:GetObject
 *             Effect: Deny
 *             Resource: arn:aws:s3:::mybucket/mypath/butnotthispath
 *         Version: "2012-10-17"
 *     Metadata:
 *       aws:cdk:path: janus-resources-for-testing-managed-policy-tagging/justin-testing/Resource* ```
 * ```
 *
 * @experimental
 */
export class GuDeveloperPolicyExperimental extends ManagedPolicy {
  constructor(scope: GuStack, id: string, props: GuWorkloadPolicyProps) {
    super(scope, id, {
      description: `${props.permission} developer policy`,
      ...props,
      path: `/developer-policy/${props.permission}/`,
    });

    // Don't mind if it's missing, but if it's used it must not be empty
    if (props.statements?.length == 0) {
      throw new Error("Empty statements array passed to GuDeveloperPolicyExperimental");
    }

    // Later, apply to the stack and check for specific errors
    Aspects.of(this).add(new GuDeveloperPolicyExperimentalChecker());
  }
}

class GuDeveloperPolicyExperimentalChecker implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof CfnManagedPolicy) {
      const policyDocumentJson: unknown = (node.policyDocument as PolicyDocument).toJSON();

      // These conditions will result in failures from the AWS classes themselves, so we don't need to validate them.
      if (policyDocumentJson === null || typeof policyDocumentJson !== "object") {
        return;
      }
      if (!("Statement" in policyDocumentJson)) {
        return;
      }
      if (!Array.isArray(policyDocumentJson.Statement) || policyDocumentJson.Statement.length == 0) {
        return;
      }

      // For the following conditions, we want to make a strong assertions: you cannot "Allow" with wildcards.
      for (const statement of policyDocumentJson.Statement) {
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

  /**
   * Ensure that we don't have either actions or resources of the following forms:
   *
   *   *
   *   s3:*
   *   arn:aws:dynamodb:us-east-2:account-ID-without-hyphens:table/*
   *   arn:aws:s3:::*
   *
   * @param checkString resource or action
   * @param node
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
