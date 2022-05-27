import { CfnParameter } from "aws-cdk-lib";
import { SSM_PARAMETER_PATHS } from "../../../constants";
import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuApp } from "../app";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

/**
 * Creates a CloudFormation parameter which references the bucket used to store code artifacts.
 * By default, the bucket name is stored in an SSM Parameter called `/account/services/artifact.bucket`.
 */
export class GuDistributionBucketParameter extends CfnParameter {
  private static instance: GuDistributionBucketParameter | undefined;

  private constructor(scope: GuStack) {
    super(scope, "DistributionBucketName", {
      description: SSM_PARAMETER_PATHS.DistributionBucket.description,
      default: SSM_PARAMETER_PATHS.DistributionBucket.path,
      type: "AWS::SSM::Parameter::Value<String>",
    });
  }

  public static getInstance(stack: GuStack): GuDistributionBucketParameter {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuDistributionBucketParameter(stack);
    }

    return this.instance;
  }
}

// TODO should this be a singleton?
export class GuPrivateConfigBucketParameter extends GuStringParameter {
  public static parameterName = "PrivateConfigBucketName";

  constructor(scope: GuApp) {
    super(scope, GuPrivateConfigBucketParameter.parameterName, {
      description: SSM_PARAMETER_PATHS.ConfigurationBucket.description,
      default: SSM_PARAMETER_PATHS.ConfigurationBucket.path,
      fromSSM: true,
    });
  }
}
