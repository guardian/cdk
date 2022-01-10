import type { GuStack } from "../../core";
import { GuAllowPolicy } from "./base-policy";
import type { GuNoStatementsPolicyProps } from "./base-policy";

export interface GuPutS3ObjectPolicyProps extends GuNoStatementsPolicyProps {
  bucketName: string;
  paths?: string[];
}

export class GuPutS3ObjectsPolicy extends GuAllowPolicy {
  constructor(scope: GuStack, id: string, props: GuPutS3ObjectPolicyProps) {
    const { paths = ["*"] } = props; // set defaults
    const s3Resources: string[] = paths.map((path) => `arn:aws:s3:::${props.bucketName}/${path}`);
    super(scope, id, { ...props, actions: ["s3:PutObject"], resources: s3Resources });
  }
}
