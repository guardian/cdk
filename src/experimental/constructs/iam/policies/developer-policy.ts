import type { IAspect } from "aws-cdk-lib";
import { Annotations, Aspects } from "aws-cdk-lib";
import { Effect, type PolicyDocument, type PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CfnManagedPolicy, ManagedPolicy } from "aws-cdk-lib/aws-iam";
import type { IConstruct } from "constructs";
import type { GuStack } from "../../../../constructs/core";

export type GuDeveloperPolicyExperimentalProps = {
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
   * A brief description to help choose the correct developer policy in Janus or elsewhere.
   *
   * In AWS this will appear as the managed policy description.
   */
  readonly friendlyName: string;
  /**
   * An optional marker which suppresses the check and warnings on overbroad permissions
   */
  readonly withoutPolicyChecks?: boolean;
};

/**
 * Creates a structured `AWS::IAM::ManagedPolicy` resource to manage arbitrary permissions on general account
 * resources which can then be used to create limited permission credentials for use with specific activities.
 *
 * The permission scope is not controlled.  This class should be used with care to create minimal permissions.
 * To that end, broad ALLOW permissions can be pruned with narrower optional DENY permissions.
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
  constructor(scope: GuStack, id: string, props: GuDeveloperPolicyExperimentalProps) {
    super(scope, id, {
      ...props,
      // Bear in mind that path has max length 512 chars
      path: `/developer-policy/${scope.repositoryName}/${scope.stack}/${scope.stage}/${props.grantId}/`,
      description: props.friendlyName,
    });

    Aspects.of(this).add(new GuDeveloperPolicyExperimentalRequiredChecker());

    if (!props.withoutPolicyChecks) {
      // Later, apply to the stack and check for specific errors
      Aspects.of(this).add(new GuDeveloperPolicyExperimentalOptionalChecker());
    }
  }
}

// Add checks here that we require and don't allow users to opt out of.
class GuDeveloperPolicyExperimentalRequiredChecker implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof CfnManagedPolicy) {
      const description = node.description;
      const maxLength = 60;

      if (!description?.length) {
        Annotations.of(node).addError("friendlyName must be filled in");
      } else if (description.length > maxLength) {
        Annotations.of(node).addError(
          `friendlyName must be no more than ${maxLength} characters long, but was ${description.length} characters`,
        );
      }
    }
  }
}

// Add checks here that we recommend for most scenarios but don't require.
class GuDeveloperPolicyExperimentalOptionalChecker implements IAspect {
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
      if (!Array.isArray(policyDocumentJson.Statement)) {
        return;
      }
      if (policyDocumentJson.Statement.length === 0) {
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
            // Typescript requires us to check this, because the data model doesn't guarantee it
            Annotations.of(node).addError("Statement is missing a Resource");
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
   * @param checkString Action or resource value to validate.
   * @param checkType Label used in validation error messages (for example, Action or Resource).
   * @param node Policy node used to attach validation annotations.
   * @private
   */
  private check(checkString: string, checkType: string, node: CfnManagedPolicy) {
    if (checkString === "*" || checkString.includes(":*") || checkString.includes("/*")) {
      Annotations.of(node).addError(
        `Statement ${checkType} is too broad: ${checkString}. If this is necessary and intended, use withoutPolicyChecks: true in properties to turn off this check`,
      );
    }
  }
  private checkAction(checkString: string, node: CfnManagedPolicy) {
    this.check(checkString, "Action", node);
  }
  private checkResource(checkString: string, node: CfnManagedPolicy) {
    this.check(checkString, "Resource", node);
  }
}
