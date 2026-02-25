import { Annotations } from "aws-cdk-lib";
import { Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../core";
import type { GuAllowPolicyProps, GuDenyPolicyProps } from "./base-policy";

export type GuWorkloadPolicyProps = {
  /**
   * List of explicitly allowed permissions given by this policy.
   */
  readonly allow: GuAllowPolicyProps[];
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
 */
export class GuDeveloperPolicy extends ManagedPolicy {
  constructor(scope: GuStack, id: string, props: GuWorkloadPolicyProps) {
    super(scope, id, {
      description: `${props.permission} developer policy`,
      ...props,
      path: `/developer-policy/${props.permission}/`,
    });

    let valid = true;

    for (const allowed of props.allow) {
      // validity checks
      const name = allowed.policyName ?? allowed.actions.join(",") + " on " + allowed.resources.join(",");
      for (const resource of allowed.resources) {
        if (resource === "*") {
          Annotations.of(this).addError(`Resource of '*' found in ${name} ALLOW permission`);
          valid = false;
        }
      }
      for (const action of allowed.actions) {
        if (action === "*") {
          const name = allowed.policyName ?? allowed.actions.join(",");
          Annotations.of(this).addError(`Action of '*' found in ${name} ALLOW permission`);
          valid = false;
        }
      }
      this.addStatements(
        new PolicyStatement({
          effect: Effect.ALLOW,
          resources: allowed.resources,
          actions: allowed.actions,
        }),
      );
    }

    if (!valid) {
      throw new Error("Overly broad permission present, see annotations for details");
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
  }
}
