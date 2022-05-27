import { Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import type { Identity } from "./identity";
import type { GuStack } from "./stack";

export class GuApp extends Construct implements Identity {
  public readonly stack: string;
  public readonly stage: string;
  public readonly app: string;

  /**
   * A sanitised version of `app` suitable to use for the logical ID of CloudFormation resources, which must be alphanumeric.
   * Typically, only needed when wanting to create a static (deterministic) logical ID during synthesis.
   *
   * @see https://stackoverflow.com/a/20864946
   */
  public readonly appForLogicalId: string;

  public readonly parent: GuStack;

  // eslint-disable-next-line custom-rules/valid-constructors -- `scope` cannot be `GuApp` as that's recursive
  constructor(scope: GuStack, id: string) {
    super(scope, id);

    this.stack = scope.stack;
    this.stage = scope.stage;
    this.app = id;

    const titleCaseApp = id.charAt(0).toUpperCase() + id.slice(1);
    this.appForLogicalId = titleCaseApp.replace(/[\W_]+/g, "");

    this.parent = scope;

    Tags.of(this).add("App", id);
  }
}
