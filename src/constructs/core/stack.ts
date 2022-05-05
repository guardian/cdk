import { App, LegacyStackSynthesizer, Stack, Tags } from "aws-cdk-lib";
import type { StackProps } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import gitUrlParse from "git-url-parse";
import { BuildNumberTag, ContextKeys, TagKeys, TrackingTag } from "../../constants";
import type { GuMigratingStack } from "../../types";
import { gitRemoteOriginUrl } from "../../utils/git";
import type { StackStageIdentity } from "./identity";
import type { GuParameter } from "./parameters";

export interface GuStackProps extends Omit<StackProps, "stackName">, Partial<GuMigratingStack> {
  /**
   * The Guardian stack being used (as defined in your riff-raff.yaml).
   * This will be applied as a tag to all of your resources.
   */
  stack: string;

  stage: string;

  /**
   * The AWS CloudFormation stack name (as shown in the AWS CloudFormation UI).
   * @defaultValue the `GU_CFN_STACK_NAME` environment variable
   */
  cloudFormationStackName?: string;
  /**
   * Set this to true to stop the GuStack from tagging all of your AWS resources.
   * This should only be turned on as part of an initial migration from CloudFormation.
   */
  withoutTags?: boolean;
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
export class GuStack extends Stack implements StackStageIdentity, GuMigratingStack {
  private readonly _stack: string;
  private readonly _stage: string;

  private params: Map<string, GuParameter>;

  public readonly migratedFromCloudFormation: boolean;

  get stage(): string {
    return this._stage;
  }

  get stack(): string {
    return this._stack;
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

  get parameterKeys(): string[] {
    return Array.from(this.params.keys());
  }

  // eslint-disable-next-line custom-rules/valid-constructors -- GuStack is the exception as it must take an App
  constructor(app: App, id: string, props: GuStackProps) {
    const {
      cloudFormationStackName = process.env.GU_CFN_STACK_NAME,
      migratedFromCloudFormation,
      stack,
      stage,
      withoutTags,
    } = props;

    super(app, id, {
      ...props,
      stackName: cloudFormationStackName,

      // TODO Use `DefaultStackSynthesizer` or create own synthesizer?
      //  see https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-custom-synth
      synthesizer: new LegacyStackSynthesizer(),
    });

    this.migratedFromCloudFormation = !!migratedFromCloudFormation;

    this.params = new Map<string, GuParameter>();

    this._stack = stack;
    this._stage = stage.toUpperCase();

    if (!withoutTags) {
      this.addTag(TrackingTag.Key, TrackingTag.Value);

      this.addTag("Stack", this.stack);
      this.addTag("Stage", this.stage);

      this.tryAddRepositoryTag();

      this.addTag(BuildNumberTag.Key, BuildNumberTag.Value);
    }
  }

  /**
   * Adds a tag to resources in the stack for the repository name.
   * The value is retrieved in the following order:
   *   1. From the context
   *   2. From git config
   *
   * @private
   */
  private tryAddRepositoryTag(): void {
    try {
      const urlFromContext = this.node.tryGetContext(ContextKeys.REPOSITORY_URL) as string | undefined;
      const repositoryUrl: string = urlFromContext ?? gitRemoteOriginUrl();
      const repositoryName = gitUrlParse(repositoryUrl).full_name;
      this.addTag(TagKeys.REPOSITORY_NAME, repositoryName);
    } catch {
      console.info(
        `Unable to find git repository name. Set the ${ContextKeys.REPOSITORY_URL} context value or configure a git remote`
      );
    }
  }
}

/**
 * A GuStack but designed for Stack Set instances.
 *
 * In a stack set application, `GuStackForStackSetInstance` is used to represent the infrastructure to provision in target AWS accounts.
 */
export class GuStackForStackSetInstance extends GuStack {
  // eslint-disable-next-line custom-rules/valid-constructors -- GuStackForStackSet should have a unique `App`
  constructor(id: string, props: GuStackProps) {
    super(new App(), id, props);
  }

  get cfnJson(): string {
    return JSON.stringify(Template.fromStack(this).toJSON(), null, 2);
  }
}
