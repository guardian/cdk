import type { GuPrivateS3ConfigurationProps } from "../../../utils/ec2";
import { GuAppAwareConstruct } from "../../../utils/mixin/app-aware-construct";
import { GuDistributionBucketParameter } from "../../core";
import type { AppIdentity, GuStack } from "../../core";
import { GuGetPrivateConfigPolicy, GuGetS3ObjectsPolicy } from "../policies";
import { GuManagedPolicy } from "./base-managed-policy";
import type { GuManagedPolicyProps } from "./base-managed-policy";

export interface GuGetS3ObjectManagedPolicyProps extends Omit<GuManagedPolicyProps, "statements"> {
  bucketName: string;
  paths?: string[];
}

export class GuGetS3ObjectsManagedPolicy extends GuManagedPolicy {
  constructor(scope: GuStack, id: string, props: GuGetS3ObjectManagedPolicyProps) {
    super(scope, id, {
      ...props,
      statements: GuGetS3ObjectsPolicy.buildStatements(props.bucketName, props.paths),
    });
  }
}

export class GuGetDistributableManagedPolicy extends GuAppAwareConstruct(GuManagedPolicy) {
  constructor(scope: GuStack, props: AppIdentity) {
    const path = [scope.stack, scope.stage, props.app, "*"].join("/");
    super(scope, "GetDistributableManagedPolicy", {
      statements: GuGetS3ObjectsPolicy.buildStatements(
        GuDistributionBucketParameter.getInstance(scope).valueAsString,
        [path],
      ),
      ...props,
    });
  }
}

export class GuGetPrivateConfigManagedPolicy extends GuManagedPolicy {
  constructor(scope: GuStack, id: string, props: GuPrivateS3ConfigurationProps) {
    super(scope, id, {
      statements: GuGetPrivateConfigPolicy.buildStatements(props.bucket.valueAsString, props.files),
    });
  }
}
