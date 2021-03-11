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

export class GuPrivateConfigBucketParameter extends GuStringParameter {
  public static parameterName = "PrivateConfigBucketName";

  constructor(scope: GuStack, id: string = GuPrivateConfigBucketParameter.parameterName) {
    super(scope, id, {
      description: "SSM parameter containing the S3 bucket name holding the app's private configuration",
      default: "/account/services/private.config.bucket",
      fromSSM: true,
    });
  }
}
