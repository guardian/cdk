import { Annotations, App, CfnParameter, LegacyStackSynthesizer, Stack, Tags } from "aws-cdk-lib";
import type { CfnElement, StackProps } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { CfnInclude } from "aws-cdk-lib/cloudformation-include";
import type { IConstruct } from "constructs";
import gitUrlParse from "git-url-parse";
import { ContextKeys, LibraryInfo, TagKeys, TrackingTag } from "../../constants";
import { gitRemoteOriginUrl } from "../../utils/git";
import type { StackStageIdentity } from "./identity";
import type { GuStaticLogicalId } from "./migrating";

export interface GuStackProps extends Omit<StackProps, "stackName"> {
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
export class GuStack extends Stack implements StackStageIdentity {
  private readonly _stack: string;
  private readonly _stage: string;

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

  /**
   * Returns all the parameters on this stack.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html
   */
  get parameters(): Record<string, CfnParameter> {
    return this.node
      .findAll()
      .filter((construct) => construct instanceof CfnParameter)
      .reduce((acc, param) => ({ ...acc, [param.node.id]: param as CfnParameter }), {});
  }

  // eslint-disable-next-line custom-rules/valid-constructors -- GuStack is the exception as it must take an App
  constructor(app: App, id: string, props: GuStackProps) {
    const { cloudFormationStackName = process.env.GU_CFN_STACK_NAME, stack, stage, withoutTags } = props;

    super(app, id, {
      ...props,
      stackName: cloudFormationStackName,

      // TODO Use `DefaultStackSynthesizer` or create own synthesizer?
      //  see https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html#bootstrapping-custom-synth
      synthesizer: new LegacyStackSynthesizer(),
    });

    this._stack = stack;
    this._stage = stage.toUpperCase();

    if (!withoutTags) {
      this.addTag(TrackingTag.Key, TrackingTag.Value);

      this.addTag("Stack", this.stack);
      this.addTag("Stage", this.stage);

      this.tryAddRepositoryTag();
    }

    const { node } = this;

    node.addValidation({
      validate(): string[] {
        const NO_ERRORS: string[] = [];

        node
          .findAll()
          .filter((construct) => construct instanceof CfnInclude)
          .map((cfnInclude) => {
            Annotations.of(cfnInclude).addWarning(
              `As you're migrating a YAML/JSON template to ${LibraryInfo.NAME}, be sure to check for any stateful resources! See https://github.com/guardian/cdk/blob/main/docs/stateful-resources.md.`
            );
          });

        return NO_ERRORS;
      },
    });
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

  /**
   * Override the auto-generated logical ID for a resource, in the generated CloudFormation template, with a static one.
   *
   * Of particular use when migrating a JSON/YAML CloudFormation template into GuCDK.
   * It's generally advised to retain the logical ID for stateful resources, such as databases or buckets.
   *
   * Let's say we have a YAML template:
   *
   * ```yaml
   * AWSTemplateFormatVersion: '2010-09-09'
   * Resources:
   *   UsesTable:
   *     Type: AWS::DynamoDB::Table
   *     Properties:
   *       TableName: !Sub 'users-${stage}'
   * ```
   *
   * When moving to GuCDK we'll have this:
   *
   * class MyStack extends GuStack {
   *   constructor(app: App, id: string, props: GuStackProps) {
   *     super(app, id, props);
   *
   *     const { stage } = this;
   *
   *     new Table(this, "UsersTable", {
   *       name: `users-${stage}`
   *     });
   *   }
   * }
   *
   * During synthesis, CDK auto-generates logical IDs, so we'll have a stack with a DynamoDB table named 'UsersTable<SOME GUID>', NOT `UsersTable`.
   * That is, the `UsersTable` table will be deleted.
   *
   * In order to retain the original ID from the YAML template, we will do:
   *
   * class MyStack extends GuStack {
   *   constructor(app: App, id: string, props: GuStackProps) {
   *     super(app, id, props);
   *
   *     const { stage } = this;
   *
   *     const table = new Table(this, "UsersTable", {
   *       name: `users-${stage}`
   *     });
   *
   *     this.overrideLogicalId(table, { logicalId: "UsersTable", reason: "Retaining a stateful resource from the YAML template" });
   *   }
   * }
   *
   * @param construct The (stateful) resource to retain the logical ID of.
   * @param logicalId The logical ID of the resource (as defined in the JSON/YAML template.
   * @param reason A small explanation to keep the logical ID. Mainly used to help future developers.
   */
  public overrideLogicalId(construct: IConstruct, { logicalId, reason }: GuStaticLogicalId): void {
    const {
      node: { id, defaultChild },
    } = construct;

    (defaultChild as CfnElement).overrideLogicalId(logicalId);
    Annotations.of(construct).addInfo(`Setting logical ID for ${id} to ${logicalId}. Reason: ${reason}`);
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
