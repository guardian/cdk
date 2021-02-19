import type { GuStack } from "../../core";
import { GuDistributionBucketParameter } from "../../core";
import type { GuNoStatementsPolicyProps } from "./base-policy";
import { GuAllowPolicy } from "./base-policy";

export interface GuGetS3ObjectPolicyProps extends GuNoStatementsPolicyProps {
  bucketName: string;
  path?: string;
}

export class GuGetS3ObjectPolicy extends GuAllowPolicy {
  constructor(scope: GuStack, id: string, props: GuGetS3ObjectPolicyProps) {
    const path: string = props.path ?? "*";
    super(scope, id, { ...props, actions: ["s3:GetObject"], resources: [`arn:aws:s3:::${props.bucketName}/${path}`] });
  }
}

export class GuGetDistributablePolicy extends GuGetS3ObjectPolicy {
  constructor(scope: GuStack, id: string = "GetDistributablePolicy", props?: GuNoStatementsPolicyProps) {
    const path = [scope.stack, scope.stage, scope.app, "*"].join("/");
    super(scope, id, { ...props, bucketName: new GuDistributionBucketParameter(scope).valueAsString, path });
  }
}
