import type { App, StackProps } from "@aws-cdk/core";
import { Stack, Tags } from "@aws-cdk/core";
import { TrackingTag } from "../../constants/library-info";
import type { GuParameter } from "./parameters";
import { GuStageParameter } from "./parameters";

export interface GuStackProps extends StackProps {
  // This limits GuStack to supporting a single app.
  // In the future, support for stacks with multiple apps may be required
  app: string;
  stack: string;
  migratedFromCloudFormation?: boolean;
}

/**
 * GuStack provides the `stack` and `stage` parameters to a template.
 * It also takes the `app` in the constructor.
 *
 * GuStack will add the Stack, Stage and App tags to all resources.
 *
 * GuStack also adds the tag `X-Gu-CDK-Version`.
 * This tag allows us to measure adoption of this library.
 * It's value is the version of guardian/cdk being used, as defined in `package.json`.
 * As a result, the change sets between version numbers will be fairly noisy,
 * as all resources receive a tag update.
 * It is recommended to upgrade the version of @guardian/cdk being used in two steps:
 *   1. Bump the library, apply the tag updates
 *   2. Make any other stack changes
 *
 * Typical usage is to extend GuStack:
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
  private readonly _stack: string;
  private readonly _app: string;

  private params: Map<string, GuParameter>;

  public readonly migratedFromCloudFormation: boolean;

  get stage(): string {
    return this.getParam(GuStageParameter.defaultId).valueAsString;
  }

  get stack(): string {
    return this._stack;
  }

  get app(): string {
    return this._app;
  }

  /**
   * A helper function to add a tag to all resources in a stack.
   *
   * Note: tags will be listed in alphabetical order during synthesis.
   *
   * @param key the tag name
   * @param value the value of the tag
   * @param applyToLaunchedInstances whether or not to apply the tag to instances launched in an ASG.
   * @protected
   */
  protected addTag(key: string, value: string, applyToLaunchedInstances: boolean = true): void {
    // TODO add validation for `key` and `value`
    //  see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html
    Tags.of(this).add(key, value, { applyToLaunchedInstances });
  }

  setParam(value: GuParameter): void {
    this.params.set(value.id, value);
  }

  getParam<T extends GuParameter>(key: string): T {
    if (!this.params.has(key)) {
      throw new Error(`Attempting to read parameter ${key} which does not exist`);
    }

    return this.params.get(key) as T;
  }

  // eslint-disable-next-line custom-rules/valid-constructors -- GuStack is the exception as it must take an App
  constructor(app: App, id: string, props: GuStackProps) {
    super(app, id, props);

    this.migratedFromCloudFormation = !!props.migratedFromCloudFormation;

    this.params = new Map<string, GuParameter>();

    new GuStageParameter(this);
    this._stack = props.stack;
    this._app = props.app;

    this.addTag(TrackingTag.Key, TrackingTag.Value);

    this.addTag("Stack", this.stack);
    this.addTag("Stage", this.stage);
    this.addTag("App", props.app);
  }
}
