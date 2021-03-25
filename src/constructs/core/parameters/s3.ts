import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

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
    // Resources can only live in the same App so return a new instance where necessary.
    // See https://github.com/aws/aws-cdk/blob/0ea4b19afd639541e5f1d7c1783032ee480c307e/packages/%40aws-cdk/core/lib/private/refs.ts#L47-L50
    const isSameStack = this.instance?.node.root === stack.node.root;

    if (!this.instance || !isSameStack) {
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
