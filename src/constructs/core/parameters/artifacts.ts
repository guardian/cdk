import { NAMED_SSM_PARAMETER_PATHS } from "../../../constants";
import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuStack } from "../stack";
import { GuStringParameter } from "./base";

/**
 * Creates a CloudFormation parameter which references the account used to store artifacts.
 * By default, the account ID is stored in an SSM Parameter called `/account/services/artifacts`.
 */
export class GuArtifactsAccountId extends GuStringParameter {
  private static instance: GuArtifactsAccountId | undefined;

  private constructor(scope: GuStack) {
    super(scope, "ArtifactsAccountId", {
      description: NAMED_SSM_PARAMETER_PATHS.ArtifactsAccountId.description,
      default: NAMED_SSM_PARAMETER_PATHS.ArtifactsAccountId.path,
      fromSSM: true,
    });
  }

  public static getInstance(stack: GuStack): GuArtifactsAccountId {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuArtifactsAccountId(stack);
    }

    return this.instance;
  }
}
