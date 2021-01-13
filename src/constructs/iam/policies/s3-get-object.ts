import type { GuStack } from "../../core";
import type { GuPolicyProps } from "./base-policy";
import { GuAllowPolicy } from "./base-policy";

export interface GuGetS3ObjectPolicyProps extends GuPolicyProps {
  bucketName: string;
}

export class GuGetS3ObjectPolicy extends GuAllowPolicy {
  constructor(scope: GuStack, id: string, props: GuGetS3ObjectPolicyProps) {
    super(scope, id, { ...props, actions: ["s3:GetObject"], resources: [`arn:aws:s3:::${props.bucketName}/*`] });
  }
}
