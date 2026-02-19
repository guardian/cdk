import { CustomResource, Duration } from "aws-cdk-lib";
import { Effect, ManagedPolicy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { ManagedPolicyProps } from "aws-cdk-lib/aws-iam";
import { Code, Runtime, SingletonFunction } from "aws-cdk-lib/aws-lambda";
import type { GuStack } from "../../core";

const TAGGER_LAMBDA_CODE = `
import boto3
import cfnresponse

def handler(event, context):
    physical_id = event.get('PhysicalResourceId', 'none')
    try:
        iam = boto3.client('iam')
        props = event['ResourceProperties']
        arn = props['PolicyArn']
        tags = props.get('Tags', [])
        physical_id = arn
        if event['RequestType'] in ['Create', 'Update']:
            iam.tag_policy(
                PolicyArn=arn,
                Tags=[{'Key': t['Key'], 'Value': t['Value']} for t in tags],
            )
        elif event['RequestType'] == 'Delete':
            try:
                iam.untag_policy(
                    PolicyArn=arn,
                    TagKeys=[t['Key'] for t in tags],
                )
            except Exception:
                pass
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {}, physical_id)
    except Exception as e:
        print(e)
        cfnresponse.send(event, context, cfnresponse.FAILED, {'Error': str(e)}, physical_id)
`;

const TAGGER_UUID = "gu-managed-policy-tagger-d5f9a8c2";

export interface GuJanusTags {
  /** A human-readable name for this policy, shown in Janus. */
  janusName?: string;
  /** A description of what this policy grants, shown in Janus. */
  janusDescription?: string;
}

export type GuManagedPolicyProps = ManagedPolicyProps & GuJanusTags;

export class GuManagedPolicy extends ManagedPolicy {
  constructor(scope: GuStack, id: string, props?: GuManagedPolicyProps) {
    super(scope, id, { path: "/", ...props });

    const tags: { Key: string; Value: string }[] = [
      { Key: "gu:janus:discoverable", Value: "true" },
    ];

    if (props?.janusName) {
      tags.push({ Key: "gu:janus:name", Value: props.janusName });
    }
    if (props?.janusDescription) {
      tags.push({ Key: "gu:janus:description", Value: props.janusDescription });
    }

    const tagger = new SingletonFunction(this, "PolicyTagger", {
      uuid: TAGGER_UUID,
      runtime: Runtime.PYTHON_3_12,
      code: Code.fromInline(TAGGER_LAMBDA_CODE),
      handler: "index.handler",
      timeout: Duration.seconds(30),
      initialPolicy: [
        new PolicyStatement({
          actions: ["iam:TagPolicy", "iam:UntagPolicy"],
          resources: ["*"],
        }),
      ],
    });

    new CustomResource(this, "JanusTags", {
      serviceToken: tagger.functionArn,
      properties: {
        PolicyArn: this.managedPolicyArn,
        Tags: tags,
      },
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
