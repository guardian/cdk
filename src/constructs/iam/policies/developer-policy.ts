import type { ManagedPolicyProps } from "aws-cdk-lib/aws-iam";
import { Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../core";
import type { GuAllowPolicyProps, GuDenyPolicyProps } from "./base-policy";

export type GuDeveloperPolicyProps = Omit<ManagedPolicyProps, "users" | "roles" | "groups" | "statements" | "path"> & {
  allow: GuAllowPolicyProps[];
  deny?: GuDenyPolicyProps[];
  permission: string;
  description?: string;
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
  constructor(scope: GuStack, id: string, props: GuDeveloperPolicyProps) {
    super(scope, id, {
      description: `${props.permission} developer policy`,
      managedPolicyName: props.permission,
      ...props,
      path: `/developer-policy/${props.permission}/`,
    });
    for (const allowed of props.allow) {
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
  }
}
