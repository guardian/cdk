import type { GuStack } from "../../core";
import { GuSSMParameter } from "../../core";
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

export class GuGetDistributablePolicy extends GuGetS3ObjectPolicy {
  constructor(scope: GuStack, id: string = "GetDistributablePolicy", props?: GuPolicyProps) {
    const distributionBucketNameParam = new GuSSMParameter(scope, "DistributionBucketName", {
      description: "SSM parameter containing the S3 bucket name holding distribution artifacts",
      default: "/account/services/artifact.bucket",
    });

    super(scope, id, { ...props, bucketName: distributionBucketNameParam.valueAsString });
  }
}
