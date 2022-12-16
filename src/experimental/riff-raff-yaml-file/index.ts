import { writeFileSync } from "fs";
import path from "path";
import type { App } from "aws-cdk-lib";
import { Token } from "aws-cdk-lib";
import chalk from "chalk";
import { dump } from "js-yaml";
import { GuAutoScalingGroup } from "../../constructs/autoscaling";
import { GuStack } from "../../constructs/core";
import { GuLambdaFunction } from "../../constructs/lambda";
import { GuS3OriginBucket } from "../../constructs/s3";
import { autoscalingDeployment, uploadAutoscalingArtifact } from "./deployments/autoscaling";
import { addAmiParametersToCloudFormationDeployment, cloudFormationDeployment } from "./deployments/cloudformation";
import { updateLambdaDeployment, uploadLambdaArtifact } from "./deployments/lambda";
import { uploadStaticFilesDeployment } from "./deployments/s3";
import { groupByClassNameStackRegionStage } from "./group-by";
import type {
  ClassName,
  GroupedCdkStacks,
  Region,
  RiffRaffDeployment,
  RiffRaffDeploymentName,
  RiffRaffDeploymentProps,
  RiffRaffYaml,
  StackTag,
  StageTag,
} from "./types";

/**
 * A class that creates a `riff-raff.yaml` file.
 *
 * Rather than using this directly, prefer to use [[`GuRoot`]] instead.
 *
 * Supports:
 *   - Multiple CloudFormation stacks
 *   - Multiple regions
 *   - Lambda applications
 *   - EC2 (autoscaling) applications
 *   - Upload of static files to S3
 *
 * For lambda applications, 3 deployments will be defined:
 *   1. Lambda upload (`aws-lambda`, `action: [uploadLambda]`)
 *   2. CloudFormation deploy (`cloud-formation`)
 *   3. Lambda update (`aws-lambda`, `action: [updateLambda]`)
 *
 * For EC2 applications, 3 deployments will be defined:
 *   1. Artifact upload (`autoscaling`, `action: [uploadArtifacts]`)
 *   2. CloudFormation deploy (`cloud-formation`)
 *   3. Autoscaling deploy (`autoscaling`, `action: [deploy]`)
 *
 * For S3 uploads, 2 deployments will be defined:
 *   1. Artifact upload (`aws-s3`, `action: [uploadStaticFiles]`)
 *   2. CloudFormation deploy (`cloud-formation`)
 *
 * It assumes a Riff-Raff bundle structure as follows:
 *
 * ```
 * .
 * ├── cdk.out
 * │   └── MyApplication.template.json
 * ├── my-application
 * │   └── my-application.deb
 * ├── my-lambda
 * │   └── my-lambda.zip
 * └── my-static-site
 *     ├── index.html
 *     ├── main.js
 *     └── index.css
 * ```
 *
 * That is, all CloudFormation templates are in a `cdk.out` directory, and there is a directory per app.
 * Application artifact(s) are in the app directory.
 *
 * NOTE: The file extension is decided by you, the above file tree is used for illustration purposes.
 *
 * NOTE: Resources will be looked up by tags (Stack, Stage, App). Ensure your CFN stack is tagged appropriately!
 *
 * @see https://riffraff.gutools.co.uk/docs/reference/riff-raff.yaml.md
 * @see https://riffraff.gutools.co.uk/docs/magenta-lib/types
 */
export class RiffRaffYamlFileExperimental {
  private readonly allCdkStacks: GuStack[];
  private readonly allStackTags: StackTag[];
  private readonly allStageTags: StageTag[];
  private readonly allRegions: Region[];

  private readonly riffRaffYaml: RiffRaffYaml;
  private readonly outdir: string;

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
        [name]: allStackTags.reduce((accStackTag, stackTag) => {
          return {
            ...accStackTag,
            [stackTag]: allRegions.reduce((accRegion, region) => {
              return {
                ...accRegion,
                [region]: allStageTags.reduce((accStageTag, stageTag) => {
                  return {
                    ...accStageTag,
                    [stageTag]: this.isCdkStackPresent(name, stackTag, region, stageTag) ? "✅" : "❌",
                  };
                }, {}),
              };
            }, {}),
          };
        }, {}),
      };
    }, {});

    const missingDefinitions = Object.values(checks).flatMap((groupedByStackTag) => {
      return Object.values(groupedByStackTag).flatMap((groupedByRegion) => {
        return Object.values(groupedByRegion).flatMap((groupedByStage) => {
          return Object.values(groupedByStage).filter((_) => _ === "❌");
        });
      });
    });

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

  private getLambdas(cdkStack: GuStack): GuLambdaFunction[] {
    return cdkStack.node.findAll().filter((_) => _ instanceof GuLambdaFunction) as GuLambdaFunction[];
  }

  private getAutoScalingGroups(cdkStack: GuStack): GuAutoScalingGroup[] {
    return cdkStack.node.findAll().filter((_) => _ instanceof GuAutoScalingGroup) as GuAutoScalingGroup[];
  }

  private getOriginBuckets(cdkStack: GuStack): GuS3OriginBucket[] {
    // `GuS3OriginBucket` implements `IConstruct` to remove a `SuspiciousTypeOfGuard` warning here
    return cdkStack.node.findAll().filter((_) => _ instanceof GuS3OriginBucket) as GuS3OriginBucket[];
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

    this.outdir = app.outdir;

    const deployments = new Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>();

    const groupedStacks: GroupedCdkStacks = groupByClassNameStackRegionStage(this.allCdkStacks);

    Object.values(groupedStacks).forEach((stackTagGroup) => {
      Object.values(stackTagGroup).forEach((regionGroup) => {
        Object.values(regionGroup).forEach((stageGroup) => {
          const stacks: GuStack[] = Object.values(stageGroup).flat();

          if (stacks.length === 0) {
            throw new Error("Unable to produce a working riff-raff.yaml file; there are no stacks!");
          }

          // The items in `stacks` only differ by stage, so we can just use the first item in the list.
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length of `stacks` is checked above
          const stack = stacks[0]!;

          const lambdas = this.getLambdas(stack);
          const autoscalingGroups = this.getAutoScalingGroups(stack);
          const originBuckets = this.getOriginBuckets(stack);

          const artifactUploads: RiffRaffDeployment[] = [
            lambdas.map(uploadLambdaArtifact),
            autoscalingGroups.map(uploadAutoscalingArtifact),
          ].flat();
          artifactUploads.forEach(({ name, props }) => deployments.set(name, props));

          const cfnDeployment = cloudFormationDeployment(stacks, artifactUploads, this.outdir);
          deployments.set(cfnDeployment.name, cfnDeployment.props);

          lambdas.forEach((lambda) => {
            const lambdaDeployment = updateLambdaDeployment(lambda, cfnDeployment);
            deployments.set(lambdaDeployment.name, lambdaDeployment.props);
          });

          autoscalingGroups.forEach((asg) => {
            const asgDeployment = autoscalingDeployment(asg, cfnDeployment);
            deployments.set(asgDeployment.name, asgDeployment.props);

            deployments.set(cfnDeployment.name, addAmiParametersToCloudFormationDeployment(cfnDeployment, asg));
          });

          originBuckets.forEach((bucket) => {
            const staticFilesDeployment = uploadStaticFilesDeployment(this.allStageTags, bucket, cfnDeployment);
            deployments.set(staticFilesDeployment.name, staticFilesDeployment.props);
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
    const outPath = path.join(this.outdir, "riff-raff.yaml");
    writeFileSync(outPath, this.toYAML());
  }
}
