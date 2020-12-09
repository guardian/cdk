import type { App, StackProps } from "@aws-cdk/core";
import { Stack, Tags } from "@aws-cdk/core";
import { GuStackParameter, GuStageParameter, GuStringParameter } from "./parameters";

export interface GuStackProps extends StackProps {
  app?: string;
  appParameter?: boolean;
}

export class GuStack extends Stack {
  protected stage: GuStageParameter;
  protected stack: GuStackParameter;

  private _app: string | GuStringParameter | undefined;

  get app(): string {
    if (typeof this._app === "string") {
      return this._app;
    } else if (this._app instanceof GuStringParameter) {
      return this._app.valueAsString;
    } else {
      throw new Error("App is not set");
    }
  }

  constructor(app: App, id?: string, props?: GuStackProps) {
    super(app, id, props);

    this.stage = new GuStageParameter(this);
    this.stack = new GuStackParameter(this);

    Tags.of(this).add("Stack", this.stack.valueAsString);
    Tags.of(this).add("Stage", this.stage.valueAsString);

    if (props?.app && props.appParameter) {
      // TODO: How do we do this better with types?
      throw new Error("Cannot provide both app and appParameter props");
    } else if (props?.appParameter) {
      this._app = new GuStringParameter(this, "App", { description: "The name of the app" });
      Tags.of(this).add("App", this._app.valueAsString);
    } else if (props?.app) {
      Tags.of(this).add("App", props.app);
      this._app = props.app;
    }
  }
}
