import { Effect, PolicyStatement } from "@aws-cdk/aws-iam";
import type { GuStack } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuPolicy } from "./base-policy";

export interface GuGetS3ObjectPolicyProps extends GuPolicyProps {
  bucketName: string;
}

export const allowGetObjectPolicyStatement: (bucket: string) => { statements: PolicyStatement[] } = (
  bucketName: string
) => ({
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:GetObject"],
      resources: [`arn:aws:s3:::${bucketName}/*`],
    }),
  ],
});

export class GuGetS3ObjectPolicy extends GuPolicy {
  constructor(scope: GuStack, id: string, props: GuGetS3ObjectPolicyProps) {
    super(scope, id, { ...allowGetObjectPolicyStatement(props.bucketName), ...props });
  }
}
