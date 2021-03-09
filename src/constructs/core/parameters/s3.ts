import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

export class GuDistributionBucketParameter extends GuStringParameter {
  public static parameterName = "DistributionBucketName";

  constructor(scope: GuStack, id: string = GuDistributionBucketParameter.parameterName) {
    super(scope, id, {
      description: "SSM parameter containing the S3 bucket name holding distribution artifacts",
      default: "/account/services/artifact.bucket",
      fromSSM: true,
    });
  }
}
