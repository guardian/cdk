import type { App, StackProps } from "@aws-cdk/core";
import { Stack, Tags } from "@aws-cdk/core";
import { GuStackParameter, GuStageParameter } from "./parameters";

export interface GuStackProps extends StackProps {
  // This limits a stack to a single app
  // TODO understand how to support a multi-app stack
  app: string;
}

export class GuStack extends Stack {
  private readonly _stage: GuStageParameter;
  private readonly _stack: GuStackParameter;
  private readonly _app: string;

  get stage(): string {
    return this._stage.valueAsString;
  }

  get stack(): string {
    return this._stack.valueAsString;
  }

  get app(): string {
    return this._app;
  }

  protected addTag(key: string, value: string, applyToLaunchedInstances: boolean = true): void {
    Tags.of(this).add(key, value, { applyToLaunchedInstances });
  }

  constructor(app: App, id: string, props: GuStackProps) {
    super(app, id, props);

    this._stage = new GuStageParameter(this);
    this._stack = new GuStackParameter(this);
    this._app = props.app;

    this.addTag("Stack", this.stack);
    this.addTag("Stage", this.stage);
    this.addTag("App", props.app);
  }
}
