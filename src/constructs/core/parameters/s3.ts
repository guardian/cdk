import { isSingletonPresentInStack } from "../../../utils/test";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

/**
 * Creates a CloudFormation parameter which references the bucket used to store code artifacts.
 * By default, the bucket name is stored in an SSM Parameter called `/account/services/artifact.bucket`.
 */
export class GuDistributionBucketParameter extends GuStringParameter {
  private static instance: GuDistributionBucketParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "DistributionBucketName", {
      description: "SSM parameter containing the S3 bucket name holding distribution artifacts",
      default: "/account/services/artifact.bucket",
      fromSSM: true,
    });
  }

  public static getInstance(stack: GuStack): GuDistributionBucketParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuDistributionBucketParameter(stack);
    }

    return this.instance;
  }
}

export class GuPrivateConfigBucketParameter extends GuStringParameter {
  public static parameterName = "PrivateConfigBucketName";

  constructor(scope: GuStack) {
    super(scope, GuPrivateConfigBucketParameter.parameterName, {
      description: "SSM parameter containing the S3 bucket name holding the app's private configuration",
      default: "/account/services/private.config.bucket",
      fromSSM: true,
    });
  }
}
