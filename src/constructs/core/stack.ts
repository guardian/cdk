import type { App, StackProps } from "@aws-cdk/core";
import { Stack, Tags } from "@aws-cdk/core";
import { GuStackParameter, GuStageParameter } from "./parameters";

export interface GuStackProps extends StackProps {
  app?: string;
}

export class GuStack extends Stack {
  private readonly _stage: GuStageParameter;
  private readonly _stack: GuStackParameter;
  private readonly _app: string | undefined;

  get stage(): string {
    return this._stage.valueAsString;
  }

  get stack(): string {
    return this._stack.valueAsString;
  }

  get app(): string {
    if (this._app) {
      return this._app;
    } else {
      // Throw an error here so that if you forget to set app and
      // try to use it, your stack fails to generate
      throw new Error("App is not set");
    }
  }

  protected addTag(key: string, value: string, applyToLaunchedInstances: boolean = true): void {
    Tags.of(this).add(key, value, { applyToLaunchedInstances });
  }

  constructor(app: App, id?: string, props?: GuStackProps) {
    super(app, id, props);

    this._stage = new GuStageParameter(this);
    this._stack = new GuStackParameter(this);

    this.addTag("Stack", this.stack);
    this.addTag("Stage", this.stage);

    if (props?.app) {
      this._app = props.app;
      this.addTag("App", props.app);
    }
  }
}
