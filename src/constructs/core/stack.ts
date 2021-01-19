import type { App, StackProps } from "@aws-cdk/core";
import { Stack, Tags } from "@aws-cdk/core";
import { GuStackParameter, GuStageParameter } from "./parameters";

export interface GuStackProps extends StackProps {
  // This limits GuStack to supporting a single app.
  // In the future, support for stacks with multiple apps may be required
  app: string;
  migratedFromCloudFormation?: boolean;
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

  migratedFromCloudFormation: boolean;

  protected addTag(key: string, value: string, applyToLaunchedInstances: boolean = true): void {
    Tags.of(this).add(key, value, { applyToLaunchedInstances });
  }

  // eslint-disable-next-line custom-rules/valid-constructors -- GuStack is the exception as it must take an App
  constructor(app: App, id: string, props: GuStackProps) {
    super(app, id, props);

    this.migratedFromCloudFormation = !!props.migratedFromCloudFormation;

    this._stage = new GuStageParameter(this);
    this._stack = new GuStackParameter(this);
    this._app = props.app;

    this.addTag("Stack", this.stack);
    this.addTag("Stage", this.stage);
    this.addTag("App", props.app);
  }
}
