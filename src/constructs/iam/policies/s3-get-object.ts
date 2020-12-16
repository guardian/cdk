import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuPolicy } from "./base-policy";

export interface GuGetS3ObjectPolicyProps extends GuPolicyProps {
  bucket: string;
}

export const allowGetObjectPolicyStatement = (bucket: string) => ({
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:GetObject"],
      resources: [`arn:aws:s3:::${bucket}/*`],
    }),
  ],
});

export class GuGetS3ObjectPolicy extends GuPolicy {
  constructor(scope: GuStack, id: string, props: GuGetS3ObjectPolicyProps) {
    // TODO validate `props.bucket` based on the rules defined here https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-s3-bucket-naming-requirements.html

    super(scope, id, { ...allowGetObjectPolicyStatement(props.bucket), ...props });
  }
}
