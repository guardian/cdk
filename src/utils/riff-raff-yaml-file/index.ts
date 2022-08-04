import { writeFileSync } from "fs";
import path from "path";
import type { App } from "aws-cdk-lib";
import { Token } from "aws-cdk-lib";
import chalk from "chalk";
import { dump } from "js-yaml";
import { GuAutoScalingGroup } from "../../constructs/autoscaling";
import { GuStack } from "../../constructs/core";
import { GuLambdaFunction } from "../../constructs/lambda";
import { groupBy } from "../array";

// type aliases to, hopefully, improve readability
type ClassName = string;
type StackTag = string;
type StageTag = string;
type Region = string;
type CdkStacksDifferingOnlyByStage = GuStack[];

interface RiffRaffYaml {
  allowedStages: Set<StageTag>;
  deployments: Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>;
}

type RiffRaffDeploymentName = string;

interface RiffRaffDeploymentProps {
  type: string;
  regions: Set<Region>;
  stacks: Set<StackTag>;
  app: string;
  contentDirectory?: string;
  parameters: Record<string, unknown>;
  dependencies?: RiffRaffDeploymentName[];
  actions?: string[];
}

interface RiffRaffDeployment {
  name: RiffRaffDeploymentName;
  props: RiffRaffDeploymentProps;
}

/*
 The aim here is to produce an identity of a `GuStack` as a composite of:
   - Class name
   - Stack tag
   - Region
 Finally, group by stage to help form the `templateStagePaths` property for the `cloud-formation` deployment type in `riff-raff.yaml`.
 */
type GroupedCdkStacks = Record<
  ClassName,
  Record<StackTag, Record<Region, Record<StageTag, CdkStacksDifferingOnlyByStage>>>
>;

/**
 * A class creates a `riff-raff.yaml` file.
 *
 * Supports:
 *   - Multiple CloudFormation stacks
 *   - Multiple regions
 *   - Lambda applications
 *   - EC2 (autoscaling) applications
 *
 * For lambda applications, 3 deployments will be defined:
 *   1. Lambda upload (`aws-lambda`, `action: [uploadLambda]`)
 *   2. CloudFormation deploy (`cloud-formation`)
 *   3. Lambda update (`aws-lambda`, `action: [updateLambda]`)
 *
 * For EC2 applications, 3 deployments will be defined:
 *   1. CloudFormation deploy (`cloud-formation`)
 *   2. AMI parameter update (`ami-cloudformation-parameter`)
 *   3. Autoscaling deploy (`autoscaling`)
 *
 * It assumes a Riff-Raff bundle structure as follows:
 *
 * ```
 * .
 * ├── cdk.out
 * │   └── MyApplication.template.json
 * ├── my-application
 * │   └── my-application.deb
 * └── my-lambda
 *     └── my-lambda.zip
 * ```
 *
 * That is, all CloudFormation templates sit in `cdk.out`,
 * and application artifacts sit in `<app>/<app>.deb`.
 *
 * NOTE: Resources will be looked up by tags (Stack, Stage, App). Ensure your CFN stack is tagged appropriately!
 *
 * @see https://riffraff.gutools.co.uk/docs/reference/riff-raff.yaml.md
 * @see https://riffraff.gutools.co.uk/docs/magenta-lib/types
 */
export class RiffRaffYamlFile {
  private readonly allCdkStacks: GuStack[];
  private readonly allStackTags: StackTag[];
  private readonly allStageTags: StageTag[];
  private readonly allRegions: Region[];

  private readonly riffRaffYaml: RiffRaffYaml;
  private readonly outDir: string;

  private groupByClassName(cdkStacks: GuStack[]): Record<ClassName, GuStack[]> {
    return groupBy(cdkStacks, (stack) => stack.constructor.name);
  }

  private groupByStackTag(cdkStacks: GuStack[]): Record<StackTag, GuStack[]> {
    return groupBy(cdkStacks, ({ stack }) => stack);
  }

  private groupByStageTag(cdkStacks: GuStack[]): Record<StageTag, GuStack[]> {
    return groupBy(cdkStacks, ({ stage }) => stage);
  }

  private groupByRegion(cdkStacks: GuStack[]): Record<Region, GuStack[]> {
    return groupBy(cdkStacks, ({ region }) => region);
  }

  private groupByClassNameStackRegionStage(cdkStacks: GuStack[]): GroupedCdkStacks {
    return Object.entries(this.groupByClassName(cdkStacks)).reduce(
      (accClassName, [className, stacksGroupedByClassName]) => ({
        ...accClassName,
        [className]: Object.entries(this.groupByStackTag(stacksGroupedByClassName)).reduce(
          (accStackTag, [stackTag, stacksGroupedByStackTag]) => ({
            ...accStackTag,
            [stackTag]: Object.entries(this.groupByRegion(stacksGroupedByStackTag)).reduce(
              (accRegion, [region, stacksGroupedByRegion]) => ({
                ...accRegion,
                [region]: this.groupByStageTag(stacksGroupedByRegion),
              }),
              {}
            ),
          }),
          {}
        ),
      }),
      {}
    );
  }

  private isCdkStackPresent(
    expectedClassName: ClassName,
    expectedStack: StackTag,
    expectedRegion: Region,
    expectedStage: StageTag
  ): boolean {
    const matches = this.allCdkStacks.find((cdkStack) => {
      const {
        constructor: { name },
        stack,
        stage,
        region,
      } = cdkStack;
      return (
        name === expectedClassName && stack === expectedStack && stage === expectedStage && region === expectedRegion
      );
    });

    return !!matches;
  }

  /**
   * Check there are the appropriate number of `GuStack`s.
   * Expect to find an instance for each combination of `GuStack`, `stack`, `region`, and `stage`.
   *
   * If not valid, a message is logged describing what is missing to aid debugging.
   *
   * Given the following:
   *
   * ```ts
   * const app = new App();
   *
   * class MyApplicationStack extends GuStack { }
   *
   * new MyApplicationStack(app, "App-CODE-deploy", {
   *   env: {
   *     region: "eu-west-1",
   *   },
   *   stack: "deploy",
   *   stage: "CODE"
   * });
   *
   * new MyApplicationStack(app, "App-PROD-media-service", {
   *   env: {
   *     region: "eu-west-1",
   *   },
   *   stack: "media-service",
   *   stage: "PROD",
   * });
   *
   * new MyApplicationStack(app, "App-PROD-deploy", {
   *   env: {
   *     region: "eu-west-1",
   *   },
   *   stack: "deploy",
   *   stage: "PROD"
   * });
   * ```
   *
   * This will log a message like this, where ❌ denotes something missing,
   * specifically there is no `CODE` template for `media-service`.
   *
   * ```log
   * Unable to produce a working riff-raff.yaml file; missing 1 definitions (details below)
   *
   * For the class: MyApplicationStack
   *
   * ┌───────────────┬────────────────────────────┐
   * │    (index)    │         eu-west-1          │
   * ├───────────────┼────────────────────────────┤
   * │    deploy     │ { CODE: '✅', PROD: '✅' } │
   * │ media-service │ { CODE: '❌', PROD: '✅' } │
   * └───────────────┴────────────────────────────┘
   * ```
   *
   * @private
   */
  private validateStacksInApp(): void {
    type Found = "✅";
    type NotFound = "❌";
    type AppValidation = Record<ClassName, Record<StackTag, Record<Region, Record<StageTag, Found | NotFound>>>>;

    const { allCdkStacks, allStackTags, allStageTags, allRegions } = this;

    const checks: AppValidation = allCdkStacks.reduce((accClassName, { constructor: { name } }) => {
      return {
        ...accClassName,
        [name]: allStackTags.reduce(
          (accStackTag, stackTag) => ({
            ...accStackTag,
            [stackTag]: allRegions.reduce(
              (accRegion, region) => ({
                ...accRegion,
                [region]: allStageTags.reduce(
                  (accStageTag, stageTag) => ({
                    ...accStageTag,
                    [stageTag]: this.isCdkStackPresent(name, stackTag, region, stageTag) ? "✅" : "❌",
                  }),
                  {}
                ),
              }),
              {}
            ),
          }),
          {}
        ),
      };
    }, {});

    const missingDefinitions = Object.values(checks).flatMap((groupedByStackTag) =>
      Object.values(groupedByStackTag).flatMap((groupedByRegion) =>
        Object.values(groupedByRegion).flatMap((groupedByStage) =>
          Object.values(groupedByStage).filter((_) => _ === "❌")
        )
      )
    );

    if (missingDefinitions.length > 0) {
      const message = `Unable to produce a working riff-raff.yaml file; missing ${missingDefinitions.length} definitions`;

      console.log(`${message} (details below)`);
      Object.entries(checks).forEach(([className, detail]) => {
        console.log(`For the class: ${chalk.yellow(className)}`);
        console.table(detail);
      });

      throw new Error(message);
    }
  }

  private validateAllRegionsAreResolved(): void {
    const unresolved = this.allRegions.filter((region) => Token.isUnresolved(region));

    if (unresolved.length !== 0) {
      throw new Error(`Unable to produce a working riff-raff.yaml file; all stacks must have an explicit region set`);
    }
  }

  private getCloudFormationDeployment(
    cdkStacks: CdkStacksDifferingOnlyByStage,
    dependencies: RiffRaffDeployment[]
  ): RiffRaffDeployment {
    if (cdkStacks.length === 0) {
      throw new Error("Unable to produce a working riff-raff.yaml file; there are no stacks!");
    }

    // The stacks in `cdkStacks` only differ by stage, so we can just use the first item in the list for key information.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length of `cdkStacks` is checked above
    const cdkStack = cdkStacks.at(0)!;
    const {
      region,
      stack,
      constructor: { name },
    } = cdkStack;

    // TODO remove `lodash.kebabcase` dep as it's not that much code to kebab-ise a string...
    const kebabClassName = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    const deploymentName = [kebabClassName, "cfn", stack, region].join("-");

    const templateStagePaths = cdkStacks.reduce(
      (acc, { stage, templateFile }) => ({
        ...acc,
        [stage]: templateFile,
      }),
      {}
    );

    return {
      name: deploymentName,
      props: {
        type: "cloud-formation",
        regions: new Set([region]),
        stacks: new Set([stack]),
        app: kebabClassName,
        contentDirectory: this.outDir,
        parameters: {
          templateStagePaths,
        },
        // only add the `dependencies` property if there are some
        ...(dependencies.length > 0 && { dependencies: dependencies.map(({ name }) => name) }),
      },
    };
  }

  private getLambdas(cdkStack: GuStack): GuLambdaFunction[] {
    return cdkStack.node.findAll().filter((_) => _ instanceof GuLambdaFunction) as GuLambdaFunction[];
  }

  private getUploadLambdaDeployment(lambda: GuLambdaFunction): RiffRaffDeployment {
    const { app, fileName } = lambda;

    const { stack, region } = lambda.stack as GuStack;

    return {
      name: [app, "upload", stack, region].join("-"),
      props: {
        type: "aws-lambda",
        stacks: new Set([stack]),
        regions: new Set([region]),
        app,
        contentDirectory: path.parse(fileName).name,
        parameters: {
          bucketSsmLookup: true,
          lookupByTags: true,
          fileName,
        },
        actions: ["uploadLambda"],
      },
    };
  }

  private getUpdateLambdaDeployment(
    lambda: GuLambdaFunction,
    { name: cfnDeployName }: RiffRaffDeployment
  ): RiffRaffDeployment {
    const { app, fileName } = lambda;

    const { stack, region } = lambda.stack as GuStack;

    return {
      name: [app, "update", stack, region].join("-"),
      props: {
        type: "aws-lambda",
        stacks: new Set([stack]),
        regions: new Set([region]),
        app,
        contentDirectory: path.parse(fileName).name,
        parameters: {
          bucketSsmLookup: true,
          lookupByTags: true,
          fileName,
        },
        actions: ["updateLambda"],
        dependencies: [cfnDeployName],
      },
    };
  }

  private getAutoScalingGroups(cdkStack: GuStack): GuAutoScalingGroup[] {
    return cdkStack.node.findAll().filter((_) => _ instanceof GuAutoScalingGroup) as GuAutoScalingGroup[];
  }

  private getUpdateAmiDeployment(
    asg: GuAutoScalingGroup,
    { name: cfnDeployName }: RiffRaffDeployment
  ): RiffRaffDeployment {
    const { app, amiParameter, imageRecipe } = asg;
    const { stack, region } = asg.stack as GuStack;

    if (!imageRecipe) {
      throw new Error("ASG missing imageRecipe prop");
    }

    return {
      name: [app, "ami", stack, region].join("-"),
      props: {
        type: "ami-cloudformation-parameter",
        regions: new Set([region]),
        stacks: new Set([stack]),
        app,
        parameters: {
          cloudFormationStackByTags: true,
          amiParametersToTags: {
            [amiParameter.node.id]: {
              BuiltBy: "amigo",
              AmigoStage: "PROD",
              Recipe: imageRecipe,
            },
          },
        },
        dependencies: [cfnDeployName],
      },
    };
  }

  private getAutoscalingDeployment(
    asg: GuAutoScalingGroup,
    { name: updateAmiDeployName }: RiffRaffDeployment
  ): RiffRaffDeployment {
    const { app } = asg;
    const { stack, region } = asg.stack as GuStack;

    return {
      name: [app, "asg", stack, region].join("-"),
      props: {
        type: "autoscaling",
        regions: new Set([region]),
        stacks: new Set([stack]),
        app,
        parameters: {
          bucketSsmLookup: true,
        },
        dependencies: [updateAmiDeployName],
        contentDirectory: app,
      },
    };
  }

  // eslint-disable-next-line custom-rules/valid-constructors -- this needs to sit above GuStack on the cdk tree
  constructor(app: App) {
    this.allCdkStacks = app.node.findAll().filter((_) => _ instanceof GuStack) as GuStack[];
    const allowedStages = new Set(this.allCdkStacks.map(({ stage }) => stage));
    this.allStageTags = Array.from(allowedStages);
    this.allStackTags = Array.from(new Set(this.allCdkStacks.map(({ stack }) => stack)));
    this.allRegions = Array.from(new Set(this.allCdkStacks.map(({ region }) => region)));

    this.validateStacksInApp();
    this.validateAllRegionsAreResolved();

    this.outDir = app.outdir;

    const deployments = new Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>();

    const groupedStacks = this.groupByClassNameStackRegionStage(this.allCdkStacks);

    Object.values(groupedStacks).forEach((stackTagGroup) => {
      Object.values(stackTagGroup).forEach((regionGroup) => {
        Object.values(regionGroup).forEach((stageGroup) => {
          const stacks: GuStack[] = Object.values(stageGroup).flat();

          if (stacks.length === 0) {
            throw new Error("Unable to produce a working riff-raff.yaml file; there are no stacks!");
          }

          // The items in `stacks` only differ by stage, so we can just use the first item in the list.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length of `stacks` is checked above
          const stack = stacks.at(0)!;

          const lambdas = this.getLambdas(stack);

          const lambdaUploadDeployments = lambdas.map((_) => this.getUploadLambdaDeployment(_));
          lambdaUploadDeployments.forEach(({ name, props }) => {
            deployments.set(name, props);
          });

          const cfnDeployment = this.getCloudFormationDeployment(stacks, lambdaUploadDeployments);
          deployments.set(cfnDeployment.name, cfnDeployment.props);

          lambdas
            .map((_) => this.getUpdateLambdaDeployment(_, cfnDeployment))
            .forEach(({ name, props }) => deployments.set(name, props));

          this.getAutoScalingGroups(stack).forEach((asg) => {
            const amiDeployment = this.getUpdateAmiDeployment(asg, cfnDeployment);
            const asgDeployment = this.getAutoscalingDeployment(asg, amiDeployment);

            deployments.set(amiDeployment.name, amiDeployment.props);
            deployments.set(asgDeployment.name, asgDeployment.props);
          });
        });
      });
    });

    this.riffRaffYaml = {
      allowedStages,
      deployments,
    };
  }

  /**
   * The `riff-raff.yaml` file as a string.
   * Useful for testing.
   */
  toYAML(): string {
    // Add support for ES6 Set and Map. See https://github.com/nodeca/js-yaml/issues/436.
    const replacer = (_key: string, value: unknown) => {
      if (value instanceof Set) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- this is how `js-yaml` is typed
        return Array.from(value);
      }
      if (value instanceof Map) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- this is how `js-yaml` is typed
        return Object.fromEntries(value);
      }
      return value;
    };

    return dump(this.riffRaffYaml, { replacer });
  }

  /**
   * Write the `riff-raff.yaml` file to disk.
   * It'll be located with the CFN JSON templates generated by `cdk synth`.
   */
  synth(): void {
    const outPath = path.join(this.outDir, "riff-raff.yaml");
    writeFileSync(outPath, this.toYAML());
  }
}
