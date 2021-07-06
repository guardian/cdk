import { Stack, Tags } from "@aws-cdk/core";
import type { App, StackProps } from "@aws-cdk/core";
import execa from "execa";
import gitUrlParse from "git-url-parse";
import { Stage } from "../../constants";
import { ContextKeys } from "../../constants/context-keys";
import { TagKeys } from "../../constants/tag-keys";
import { TrackingTag } from "../../constants/tracking-tag";
import { Logger } from "../../utils/logger";
import type { StackStageIdentity } from "./identity";
import { GuStageMapping } from "./mappings";
import type { GuStageDependentValue } from "./mappings";
import type { GuMigratingStack } from "./migrating";
import { GuStageParameter } from "./parameters";
import type { GuParameter } from "./parameters";

export interface GuStackProps extends StackProps, Partial<GuMigratingStack> {
  stack: string;
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

  private _mappings?: GuStageMapping;
  private params: Map<string, GuParameter>;

  public readonly migratedFromCloudFormation: boolean;

  get stage(): string {
    return this._stage;
  }

  get stack(): string {
    return this._stack;
  }

  // Use lazy initialisation for GuStageMapping so that Mappings block is only created when necessary
  get mappings(): GuStageMapping {
    return this._mappings ?? (this._mappings = new GuStageMapping(this));
  }

  /**
   * A helper function to switch between different values depending on the Stage being CloudFormed (e.g.
   * use 1 in `CODE` or 3 in `PROD`).
   *
   * Note: Standard conditional logic which references a CloudFormation Parameter's value will not work
   * as Parameters are not resolved at synth-time. This helper function creates CloudFormation
   * Mappings to work around this limitation.
   */
  withStageDependentValue<T extends string | number | boolean>(stageDependentValue: GuStageDependentValue<T>): T {
    this.mappings.setValue(Stage.CODE, stageDependentValue.variableName, stageDependentValue.stageValues.CODE);
    this.mappings.setValue(Stage.PROD, stageDependentValue.variableName, stageDependentValue.stageValues.PROD);
    return this.mappings.findInMap(this.stage, stageDependentValue.variableName) as unknown as T;
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

    this._stack = props.stack;
    this._stage = GuStageParameter.getInstance(this).valueAsString;

    this.addTag(TrackingTag.Key, TrackingTag.Value);

    this.addTag("Stack", this.stack);
    this.addTag("Stage", this.stage);

    this.tryAddRepositoryTag();
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
      // a function to avoid creating a child process if value can be found in the context
      const urlFromGitConfig: () => string = () => execa.sync("git", ["config", "--get", "remote.origin.url"]).stdout;
      const urlFromContext = this.node.tryGetContext(ContextKeys.REPOSITORY_URL) as string | undefined;
      const repositoryUrl: string = urlFromContext ?? urlFromGitConfig();
      const repositoryName = gitUrlParse(repositoryUrl).full_name;
      this.addTag(TagKeys.REPOSITORY_NAME, repositoryName);
    } catch {
      Logger.info(
        `Unable to find git repository name. Set the ${ContextKeys.REPOSITORY_URL} context value or configure a git remote`
      );
    }
  }
}
