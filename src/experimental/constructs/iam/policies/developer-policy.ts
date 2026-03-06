import type { IAspect } from "aws-cdk-lib";
import { Annotations, Aspects } from "aws-cdk-lib";
import { CfnManagedPolicy, Effect, ManagedPolicy, PolicyDocument, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { IConstruct } from "constructs";
import type { GuStack } from "../../../../constructs/core";
import type { GuAllowPolicyProps, GuDenyPolicyProps } from "../../../../constructs/iam";

export type GuWorkloadPolicyProps = {
  /**
   * List of explicitly allowed permissions given by this policy.
   */
  readonly allow?: GuAllowPolicyProps[];
  /**
   * List of explicitly denied permissions which can be used to fine tune this policy by pruning the allow permissions.
   */
  readonly deny?: GuDenyPolicyProps[];
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

    // Don't mind if it's missing, but if it's used it must not be empty
    if (props.allow?.length == 0) {
      throw new Error("Empty allow array passed to GuDeveloperPolicyExperimental");
    }

    // Don't mind if it's missing, but if it's used it must not be empty
    if (props.deny?.length == 0) {
      throw new Error("Empty deny array passed to GuDeveloperPolicyExperimental");
    }

    // // Don't mind if either are missing, but one must exist
    if (!(props.statements || props.allow)) {
      throw new Error("No statements or allow values passed to GuDeveloperPolicyExperimental");
    }

    const { allow = [] } = props;

    for (const allowed of allow) {
      this.addStatements(
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: allowed.resources,
          actions: allowed.actions,
        }),
      );
    }

    const { deny = [] } = props;
    for (const denied of deny) {
      this.addStatements(
        new PolicyStatement({
          effect: Effect.DENY,
          resources: denied.resources,
          actions: denied.actions,
        }),
      );
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
        return
      }
      if (!Array.isArray(policyDocumentJson.Statement) || policyDocumentJson.Statement.length==0) {
        return
      }

      // For the following conditions, though, we want to make stronger assertions: present and not too broad
      for (const statement of policyDocumentJson.Statement) {
        if (!("Action" in statement)) {
          Annotations.of(node).addError("Statement is missing an Action");
        } else if (typeof statement.Action === 'string' && statement.Action === '*' ) {
          Annotations.of(node).addError("Statement Action is too broad");
        } else if (Array.isArray(statement.Action) && statement.Action.includes('*')) {
          Annotations.of(node).addError("Statement Action is too broad");
        }

        if (!("Effect" in statement)) {
          Annotations.of(node).addError("Statement is missing an Effect");
        }

        if (!("Resource" in statement)) {
          Annotations.of(node).addError("Statement is missing an Resource");
        } else if (typeof statement.Resource === "string" && statement.Resource === "*") {
          Annotations.of(node).addError("Statement Resource is too broad");
        } else if (Array.isArray(statement.Resource) && statement.Resource.includes("*")) {
          Annotations.of(node).addError("Statement Resource is too broad");
        }
      }
    }
  }
}
