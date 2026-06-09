import type { GuStack } from "../../core";
import { GuAllowPolicy } from "./base-policy";
import type { GuNoStatementsPolicyProps } from "./base-policy";

export interface GuAbortS3ObjectPolicyProps extends GuNoStatementsPolicyProps {
  bucketName: string;
  paths?: string[];
}

export class GuAbortMultiPartPolicy extends GuAllowPolicy {
  constructor(scope: GuStack, id: string, props: GuAbortS3ObjectPolicyProps) {
    const { paths = ["*"] } = props; // set defaults
    const s3Resources: string[] = paths.map((path) => `arn:aws:s3:::${props.bucketName}/${path}`);
    super(scope, id, { ...props, actions: ["s3:AbortMultipartUpload"], resources: s3Resources });
  }
}
