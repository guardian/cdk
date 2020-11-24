import type { App, StackProps } from "@aws-cdk/core";
import { Stack, Tags } from "@aws-cdk/core";
import { GuStackParameter, GuStageParameter } from "./parameters";

export class GuStack extends Stack {
  protected stage: GuStageParameter;
  protected stack: GuStackParameter;

  constructor(app: App, id?: string, props?: StackProps) {
    super(app, id, props);

    this.stage = new GuStageParameter(this);
    this.stack = new GuStackParameter(this);

    Tags.of(this).add("Stack", this.stack.valueAsString);
    Tags.of(this).add("Stage", this.stage.valueAsString);
  }
}
