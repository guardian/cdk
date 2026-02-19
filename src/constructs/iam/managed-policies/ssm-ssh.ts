import { isSingletonPresentInStack } from "../../../utils/singleton";
import type { GuStack } from "../../core";
import { GuSsmSshPolicy } from "../policies/ssm-ssh";
import { GuManagedPolicy } from "./base-managed-policy";

export class GuSsmSshManagedPolicy extends GuManagedPolicy {
  private static instance: GuSsmSshManagedPolicy | undefined;

  private constructor(scope: GuStack) {
    super(scope, "SsmSshManagedPolicy", {
      statements: GuSsmSshPolicy.buildStatements(),
    });
  }

  public static getInstance(stack: GuStack): GuSsmSshManagedPolicy {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuSsmSshManagedPolicy(stack);
    }

    return this.instance;
  }
}
