import type { App, StackProps } from "@aws-cdk/core";
import { Stack, Tags } from "@aws-cdk/core";
import { GuStackParameter, GuStageParameter } from "./parameters";

export interface GuStackProps extends StackProps {
  app?: string;
}

export class GuStack extends Stack {
  protected stage: GuStageParameter;
  protected stack: GuStackParameter;

  private _app: string | undefined;

  get app(): string {
    if (this._app) {
      return this._app;
    } else {
      // Throw an error here so that if you forget to set app and
      // try to use it, your stack fails to generate
      throw new Error("App is not set");
    }
  }

  constructor(app: App, id?: string, props?: GuStackProps) {
    super(app, id, props);

    this.stage = new GuStageParameter(this);
    this.stack = new GuStackParameter(this);

    Tags.of(this).add("Stack", this.stack.valueAsString);
    Tags.of(this).add("Stage", this.stage.valueAsString);

    if (props?.app) {
      this._app = props.app;
      Tags.of(this).add("App", props.app);
    }
  }
}
