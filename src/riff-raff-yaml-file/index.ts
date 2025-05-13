import { writeFileSync } from "fs";
import path from "path";
import type { App } from "aws-cdk-lib";
import { Token } from "aws-cdk-lib";
import type { CfnAutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { dump } from "js-yaml";
import { GuAutoScalingGroup } from "../constructs/autoscaling";
import { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import { GuHorizontallyScalingDeploymentPropertiesExperimental } from "../experimental/patterns/ec2-app";
import { autoscalingDeployment, uploadAutoscalingArtifact } from "./deployments/autoscaling";
import {
  cloudFormationDeployment,
  getAmiParameters,
  getMinInstancesInServiceParameters,
} from "./deployments/cloudformation";
import { updateLambdaDeployment, uploadLambdaArtifact } from "./deployments/lambda";
import { groupByClassNameStackRegionStage } from "./group-by";
import type {
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
 *
 * For lambda applications, 3 deployments will be defined:
 *   1. Lambda upload (`aws-lambda`, `action: [uploadLambda]`)
 *   2. CloudFormation deploy (`cloud-formation`)
 *   3. Lambda update (`aws-lambda`, `action: [updateLambda]`)
 *
 * For EC2 applications, 3 deployments will be defined:
 *   1. Artifact upload (`autoscaling`, `action: [uploadArtifacts]`)
 *  2. CloudFormation deploy (`cloud-formation`)
 *   3. Autoscaling deploy (`autoscaling`, `action: [deploy]`)
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
export class RiffRaffYamlFile {
  private readonly allCdkStacks: GuStack[];
  private readonly allStackTags: StackTag[];
  private readonly allStageTags: StageTag[];
  private readonly allRegions: Region[];
  private readonly outdir: string;

  /**
   * The `riff-raff.yaml` file as an object.
   *
   * It is useful for specifying additional deployment types that GuCDK does not support.
   * Consider raising an issue or pull request if you think it should be supported.
   *
   * In most cases, you shouldn't need to access this.
   * No validation is performed on the parameters you provide, so you might get deployment errors.
   *
   * @see https://riffraff.gutools.co.uk/docs/magenta-lib/types
   */
  public readonly riffRaffYaml: RiffRaffYaml;

  private isCdkStackPresent(expectedStack: StackTag, expectedStage: StageTag): boolean {
    const matches = this.allCdkStacks.find((cdkStack) => {
      const { stack, stage } = cdkStack;
      return stack === expectedStack && stage === expectedStage;
    });

    return !!matches;
  }

  /**
   * Check there are the appropriate number of `GuStack`s.
   * Expect to find an instance for each combination of `stack`, and `stage`.
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
   * ┌───────────────┬──────┬──────┐
   * │    (index)    │ CODE │ PROD │
   * ├───────────────┼──────┼──────┤
   * │    deploy     │ '✅' │ '✅' │
   * │ media-service │ '❌' │ '✅' │
   * └───────────────┴──────┴──────┘
   * ```
   *
   * @private
   */
  private validateStacksInApp(): void {
    type Found = "✅";
    type NotFound = "❌";
    type AppValidation = Record<StackTag, Record<StageTag, Found | NotFound>>;

    const { allStackTags, allStageTags } = this;

    const checks: AppValidation = allStackTags.reduce((accStackTag, stackTag) => {
      return {
        ...accStackTag,
        [stackTag]: allStageTags.reduce((accStageTag, stageTag) => {
          return {
            ...accStageTag,
            [stageTag]: this.isCdkStackPresent(stackTag, stageTag) ? "✅" : "❌",
          };
        }, {}),
      };
    }, {});

    const missingDefinitions: Array<Found | NotFound> = Object.values(checks).flatMap((groupedByStackTag) => {
      return Object.values(groupedByStackTag).filter((_) => _ === "❌");
    });

    if (missingDefinitions.length > 0) {
      const message = `Unable to produce a working riff-raff.yaml file; missing ${missingDefinitions.length} definitions`;

      console.log(`${message} (details below)`);
      console.table(checks);

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

  private getGuStackDependencies(cdkStack: GuStack): GuStack[] {
    return cdkStack.dependencies.filter((_) => _ instanceof GuStack) as GuStack[];
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

          // The items in `stacks` only differ by stage, so we can just use the first item in the list.
          const [stack] = stacks;

          if (!stack) {
            throw new Error("Unable to produce a working riff-raff.yaml file; there are no stacks!");
          }

          const lambdas = this.getLambdas(stack);
          const autoscalingGroups = this.getAutoScalingGroups(stack);

          const artifactUploads: RiffRaffDeployment[] = [
            lambdas.filter((_) => !_.withoutArtifactUpload).map(uploadLambdaArtifact),
            autoscalingGroups.map(uploadAutoscalingArtifact),
          ].flat();
          artifactUploads.forEach(({ name, props }) => deployments.set(name, props));

          const parentStacks: RiffRaffDeployment[] = this.getGuStackDependencies(stack).map((x) =>
            cloudFormationDeployment([x], [], this.outdir),
          );

          const cfnDeployment = cloudFormationDeployment(stacks, [...artifactUploads, ...parentStacks], this.outdir);
          deployments.set(cfnDeployment.name, cfnDeployment.props);

          const lambdasWithoutAnAlias = lambdas.filter((lambda) => lambda.alias === undefined);
          // If the Lambda has an alias it is using versioning. When using versioning, there is no need for Riff-Raff
          // to modify the unpublished version of the function
          lambdasWithoutAnAlias.forEach((lambda) => {
            const lambdaDeployment = updateLambdaDeployment(lambda, cfnDeployment);
            deployments.set(lambdaDeployment.name, lambdaDeployment.props);
          });

          /*
          Instances in an ASG with an `AutoScalingRollingUpdate` update policy are rotated via CloudFormation.
          Therefore, they do not need to also perform an `autoscaling` deployment via Riff-Raff.
           */
          const legacyAutoscalingGroups = autoscalingGroups.filter((asg) => {
            const { cfnOptions } = asg.node.defaultChild as CfnAutoScalingGroup;
            const { updatePolicy } = cfnOptions;
            return updatePolicy?.autoScalingRollingUpdate === undefined;
          });

          legacyAutoscalingGroups.forEach((asg) => {
            const asgDeployment = autoscalingDeployment(asg, cfnDeployment);
            deployments.set(asgDeployment.name, asgDeployment.props);
          });

          const amiParametersToTags = getAmiParameters(autoscalingGroups);

          const minInServiceParamMap =
            GuHorizontallyScalingDeploymentPropertiesExperimental.getInstance(stack).asgToParamMap;
          const minInServiceAsgs = autoscalingGroups.filter((asg) => minInServiceParamMap.has(asg.node.id));
          const minInstancesInServiceParameters = getMinInstancesInServiceParameters(minInServiceAsgs);

          deployments.set(cfnDeployment.name, {
            ...cfnDeployment.props,
            parameters: {
              ...cfnDeployment.props.parameters,

              // only add the `amiParametersToTags` property if there are some
              ...(autoscalingGroups.length > 0 && { amiParametersToTags }),

              // only add the `minInstancesInServiceParameters` property if there are some
              ...(minInServiceAsgs.length > 0 && { minInstancesInServiceParameters }),
            },
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
