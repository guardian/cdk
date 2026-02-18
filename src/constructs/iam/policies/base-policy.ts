import type { ManagedPolicyProps, PolicyProps } from "aws-cdk-lib/aws-iam";
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import type { GuStack } from "../../core";
import type { GuRole } from "../roles";
import type { GuJanusAssumablePolicyProps } from "./janus-assumable-policy";

export type GuPolicyProps = PolicyProps & { managed?: GuJanusAssumablePolicyProps };

export type GuNoStatementsPolicyProps = Omit<GuPolicyProps, "statements">;

export class GuPolicy extends Construct {
  readonly policy: Policy | ManagedPolicy;
  readonly stack: GuStack;
  constructor(scope: GuStack, id: string, props: GuPolicyProps) {
    super(scope, id);
    this.stack = scope;
    if (!props.managed) {
      this.policy = new Policy(scope, id, props);
    } else {
      console.log("making a managed policy ");
      const managedProps: ManagedPolicyProps = {
        managedPolicyName: props.policyName,
        statements: props.statements,
        ...(props as PolicyProps),
        ...(props.managed as ManagedPolicyProps),
      };
      this.policy = new ManagedPolicy(scope, `${id}Assumable`, managedProps);

      // Tag the policy using a custom resource
      new AwsCustomResource(this, "TagManagedPolicy", {
        onCreate: {
          service: "IAM",
          action: "tagPolicy",
          parameters: {
            PolicyArn: this.policy.managedPolicyArn,
            Tags: [
              { Key: "gu:janus:permission", Value: props.managed.janusPermission },
              { Key: "gu:janus:discoverable", Value: "true" },
              { Key: "gu:janus:name", Value: props.managed.janusName },
              { Key: "gu:janus:description", Value: props.managed.janusDescription },
            ],
          },
          physicalResourceId: PhysicalResourceId.of(`${this.policy.managedPolicyArn}-tags`),
        },
        onUpdate: {
          service: "IAM",
          action: "tagPolicy",
          parameters: {
            PolicyArn: this.policy.managedPolicyArn,
            Tags: [
              { Key: "gu:janus:permission", Value: props.managed.janusPermission },
              { Key: "gu:janus:discoverable", Value: "true" },
              { Key: "gu:janus:name", Value: props.managed.janusName },
              { Key: "gu:janus:description", Value: props.managed.janusDescription },
            ],
          },
          physicalResourceId: PhysicalResourceId.of(`${this.policy.managedPolicyArn}-tags`),
        },
        policy: AwsCustomResourcePolicy.fromSdkCalls({
          resources: [this.policy.managedPolicyArn],
        }),
      });
    }
  }

  attachToRole(role: GuRole) {
    if (this.policy instanceof Policy) {
      this.policy.attachToRole(role);
    } else {
      throw new Error("Cannot attach managed policies to roles")
    }
  }
}

export interface GuAllowPolicyProps extends GuNoStatementsPolicyProps {
  actions: string[];
  resources: string[];
}
export type GuDenyPolicyProps = GuAllowPolicyProps;

export class GuAllowPolicy extends GuPolicy {
  constructor(scope: GuStack, id: string, props: GuAllowPolicyProps) {
    super(scope, id, {...props, statements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: props.resources,
        actions: props.actions,
      })
      ]}
    );
  }
}

export class GuDenyPolicy extends GuPolicy {
  constructor(scope: GuStack, id: string, props: GuDenyPolicyProps) {
    super(scope, id, {
      ...props,
      statements: [
        new PolicyStatement({
          effect: Effect.DENY,
          resources: props.resources,
          actions: props.actions,
        }),
      ],
    });
  }
}
