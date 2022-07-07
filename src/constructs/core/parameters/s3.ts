import { NAMED_SSM_PARAMETER_PATHS } from "../../../constants";
import { isSingletonPresentInStack } from "../../../utils/singleton";
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
      description: NAMED_SSM_PARAMETER_PATHS.DistributionBucket.description,
      default: NAMED_SSM_PARAMETER_PATHS.DistributionBucket.path,
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
      description: NAMED_SSM_PARAMETER_PATHS.ConfigurationBucket.description,
      default: NAMED_SSM_PARAMETER_PATHS.ConfigurationBucket.path,
      fromSSM: true,
    });
  }
}
