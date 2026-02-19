import { Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { ManagedPolicyProps } from "aws-cdk-lib/aws-iam";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import type { GuStack } from "../../core";

export interface GuJanusTags {
  /** A human-readable name for this policy, shown in Janus. */
  janusName?: string;
  /** A description of what this policy grants, shown in Janus. */
  janusDescription?: string;
}

export type GuManagedPolicyProps = ManagedPolicyProps & GuJanusTags;

export class GuManagedPolicy extends ManagedPolicy {
  constructor(scope: GuStack, id: string, props?: GuManagedPolicyProps) {
    super(scope, id, props);

    const tags: { Key: string; Value: string }[] = [
      { Key: "gu:janus:discoverable", Value: "true" },
    ];

    if (props?.janusName) {
      tags.push({ Key: "gu:janus:name", Value: props.janusName });
    }
    if (props?.janusDescription) {
      tags.push({ Key: "gu:janus:description", Value: props.janusDescription });
    }

    const tagKeys = tags.map((t) => t.Key);

    new AwsCustomResource(this, "TagManagedPolicy", {
      onCreate: {
        service: "IAM",
        action: "tagPolicy",
        parameters: {
          PolicyArn: this.managedPolicyArn,
          Tags: tags,
        },
        physicalResourceId: PhysicalResourceId.of(`${id}-tags`),
      },
      onUpdate: {
        service: "IAM",
        action: "tagPolicy",
        parameters: {
          PolicyArn: this.managedPolicyArn,
          Tags: tags,
        },
        physicalResourceId: PhysicalResourceId.of(`${id}-tags`),
      },
      onDelete: {
        service: "IAM",
        action: "untagPolicy",
        parameters: {
          PolicyArn: this.managedPolicyArn,
          TagKeys: tagKeys,
        },
      },
      policy: AwsCustomResourcePolicy.fromSdkCalls({
        resources: AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
  }
}

export interface GuAllowManagedPolicyProps extends Omit<GuManagedPolicyProps, "statements"> {
  actions: string[];
  resources: string[];
}

export class GuAllowManagedPolicy extends GuManagedPolicy {
  constructor(scope: GuStack, id: string, props: GuAllowManagedPolicyProps) {
    super(scope, id, props);
    this.addStatements(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: props.resources,
        actions: props.actions,
      }),
    );
  }
}
