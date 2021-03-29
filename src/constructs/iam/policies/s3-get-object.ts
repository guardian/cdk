import type { GuPrivateS3ConfigurationProps } from "../../../utils/ec2";
import type { GuStack } from "../../core";
import { GuDistributionBucketParameter } from "../../core";
import { AppIdentity } from "../../core/identity";
import type { GuNoStatementsPolicyProps } from "./base-policy";
import { GuAllowPolicy } from "./base-policy";

export interface GuGetS3ObjectPolicyProps extends GuNoStatementsPolicyProps {
  bucketName: string;
  paths?: string[];
}

export class GuGetS3ObjectsPolicy extends GuAllowPolicy {
  constructor(scope: GuStack, id: string, props: GuGetS3ObjectPolicyProps) {
    const paths: string[] = props.paths ?? ["*"];
    const s3Resources: string[] = paths.map((path) => `arn:aws:s3:::${props.bucketName}/${path}`);
    super(scope, id, { ...props, actions: ["s3:GetObject"], resources: s3Resources });
  }
}

export class GuGetDistributablePolicy extends GuGetS3ObjectsPolicy {
  constructor(scope: GuStack, props: AppIdentity) {
    const path = [scope.stack, scope.stage, props.app, "*"].join("/");
    super(scope, AppIdentity.suffixText(props, "GetDistributablePolicy"), {
      ...props,
      bucketName: GuDistributionBucketParameter.getInstance(scope).valueAsString,
      paths: [path],
    });
    AppIdentity.taggedConstruct(props, this);
  }
}

export class GuGetPrivateConfigPolicy extends GuGetS3ObjectsPolicy {
  constructor(scope: GuStack, id: string, props: GuPrivateS3ConfigurationProps) {
    super(scope, id, { bucketName: props.bucket.valueAsString, paths: props.files });
  }
}
