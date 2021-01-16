import type { App, StackProps } from "@aws-cdk/core";
import { Stack, Tags } from "@aws-cdk/core";
import { GuStackParameter, GuStageParameter } from "./parameters";

export interface GuStackProps extends StackProps {
  // This limits GuStack to supporting a single app.
  // In the future, support for stacks with multiple apps may be required
  app: string;
}

/**
 * GuStack provides the `stack` and `stage` parameters to a template.
 * It also takes the `app` in the constructor.
 *
 * GuStack will apply the Stack, Stage and App tags to all resources added to it.
 *
 * Typical usage is to extend GuStack
 *
 * ```typescript
 * class MyStack extends GuStack {
 *   constructor(scope: App, id: string, props: GuStackProps) {
 *     super(scope, id, props)
 *   }
 *
 *   // add resources here
 * }
 * ```
 */
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

  /**
   * A helper function to add a tag to all resources in a stack.
   * @param key the tag name
   * @param value the value of the tag
   * @param applyToLaunchedInstances whether or not to apply the tag to instances launched in an ASG.
   * @protected
   */
  protected addTag(key: string, value: string, applyToLaunchedInstances: boolean = true): void {
    Tags.of(this).add(key, value, { applyToLaunchedInstances });
  }

  // eslint-disable-next-line custom-rules/valid-constructors -- GuStack is the exception as it must take an App
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
