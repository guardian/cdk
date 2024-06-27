import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuPrivateS3ConfigurationProps } from "../../../utils/ec2";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import { GuDistributionBucketParameter } from "../../core";
import type { AppIdentity, GuStack } from "../../core";
import { GuAllowPolicy } from "./base-policy";
import type { GuNoStatementsPolicyProps } from "./base-policy";

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

/**
 * Creates an `AWS::IAM::Policy` to grant `s3:GetObject` permission to the account's distribution bucket.
 * The permission is tightly scoped to the path to the app (`bucket/stack/stage/app/*`) and will look something like:
 *
 * ```yaml
 * GetDistributablePolicyTestingF9D43A3E:
 *     Type: AWS::IAM::Policy
 *     Properties:
 *       PolicyDocument:
 *         Version: "2012-10-17"
 *         Statement:
 *           - Action: s3:GetObject
 *             Effect: Allow
 *             Resource:
 *               Fn::Join:
 *                 - ""
 *                 - - 'arn:aws:s3:::'
 *                   - Ref: DistributionBucketName
 *                   - /STACK/
 *                   - Ref: Stage
 *                   - /APP/*
 *       PolicyName: GetDistributablePolicyTestingF9D43A3E
 * ```
 *
 * If necessary, an `AWS::SSM::Parameter<String>` parameter will be added to the template,
 * with a default value of `/account/services/artifact.bucket` which is the recommended Parameter Store location.
 *
 * @see GuDistributionBucketParameter
 */
export class GuGetDistributablePolicy extends GuAppAwareConstruct(GuGetS3ObjectsPolicy) {
  constructor(scope: GuStack, props: AppIdentity) {
    const path = [scope.stack, scope.stage, props.app, "*"].join("/");
    super(scope, "GetDistributablePolicy", {
      ...props,
      bucketName: GuDistributionBucketParameter.getInstance(scope).valueAsString,
      paths: [path],
    });
  }
}

export class GuGetDistributablePolicyStatement extends PolicyStatement {
  constructor(scope: GuStack, props: AppIdentity) {
    const path = [scope.stack, scope.stage, props.app, "*"].join("/");
    super({
      effect: Effect.ALLOW,
      actions: ["s3:GetObject"],
      resources: [`arn:aws:s3:::${GuDistributionBucketParameter.getInstance(scope).valueAsString}/${path}`],
    });
  }
}

export class GuGetPrivateConfigPolicy extends GuGetS3ObjectsPolicy {
  constructor(scope: GuStack, id: string, props: GuPrivateS3ConfigurationProps) {
    super(scope, id, { bucketName: props.bucket.valueAsString, paths: props.files });
  }
}
