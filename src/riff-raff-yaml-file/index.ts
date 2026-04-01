import { writeFileSync } from "fs";
import path from "path";
import type { App } from "aws-cdk-lib";
import { Token } from "aws-cdk-lib";
import type { CfnAutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { dump } from "js-yaml";
import { GuAutoScalingGroup } from "../constructs/autoscaling";
import { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import { GuAsgMinInstancesInServiceParameterExperimental } from "../experimental/patterns/ec2-app";
import { autoscalingDeployment, uploadAutoscalingArtifact } from "./deployments/autoscaling";
import {
  cloudFormationDeployment,
  getAmiParameters,
  getMinInstancesInServiceParameters,
} from "./deployments/cloudformation";
import { updateLambdaDeployment, uploadLambdaArtifact } from "./deployments/lambda";
import { updateDeploymentParameters } from "./deployments/update-parameters";
import { groupByClassName, groupByRegion, groupByStackTag, groupByStageTag } from "./group-by";
import type {
  ClassName,
  Region,
  RiffRaffDeployment,
  RiffRaffDeploymentName,
  RiffRaffDeploymentProps,
  RiffRaffYaml,
  StackTag,
  StageTag,
} from "./types";

function validateAllRegionsAreResolved(regions: Region[]): void {
  const unresolved = regions.filter((region) => Token.isUnresolved(region));

  if (unresolved.length !== 0) {
    throw new Error(`Unable to produce a working riff-raff.yaml file; all stacks must have an explicit region set`);
  }
}

function getLambdas(cdkStack: GuStack): GuLambdaFunction[] {
  return cdkStack.node.findAll().filter((_) => _ instanceof GuLambdaFunction) as GuLambdaFunction[];
}

function getAutoScalingGroups(cdkStack: GuStack): GuAutoScalingGroup[] {
  return cdkStack.node.findAll().filter((_) => _ instanceof GuAutoScalingGroup) as GuAutoScalingGroup[];
}

function getGuStackDependencies(cdkStack: GuStack): GuStack[] {
  return cdkStack.dependencies.filter((_) => _ instanceof GuStack) as GuStack[];
}

interface MissingStack {
  className: ClassName;
  stack: StackTag;
  stage: StageTag;
  region: Region;
}

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

  // eslint-disable-next-line custom-rules/valid-constructors -- this needs to sit above GuStack on the cdk tree
  constructor(app: App) {
    const allCdkStacks = app.node.findAll().filter((_) => _ instanceof GuStack) as GuStack[];
    const allowedStages = new Set(allCdkStacks.map((_) => _.stage));
    const allRegions = Array.from(new Set(allCdkStacks.map((_) => _.region)));

    validateAllRegionsAreResolved(allRegions);

    this.outdir = app.outdir;

    const deployments = new Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>();

    const missingStacks: MissingStack[] = [];
    const requiredStages = Array.from(allowedStages);

    Object.entries(groupByClassName(allCdkStacks)).forEach(([className, stacksGroupedByClassName]) => {
      Object.entries(groupByStackTag(stacksGroupedByClassName)).forEach(([stackTag, stacksGroupedByStackTag]) => {
        Object.entries(groupByRegion(stacksGroupedByStackTag)).forEach(([region, stacksGroupedByRegion]) => {
          const stacks: GuStack[] = Object.values(groupByStageTag(stacksGroupedByRegion)).flat();

          requiredStages.forEach((requiredStage) => {
            if (!stacks.find(({ stage }) => stage === requiredStage)) {
              missingStacks.push({ className, region, stack: stackTag, stage: requiredStage });
            }
          });

          // The items in `stacks` only differ by stage, so we can just use the first item in the list.
          const [stack] = stacks;

          if (!stack) {
            throw new Error("Unable to produce a working riff-raff.yaml file; there are no stacks!");
          }

          const lambdas = getLambdas(stack);
          const autoscalingGroups = getAutoScalingGroups(stack);

          const artifactUploads: RiffRaffDeployment[] = [
            lambdas.filter((_) => !_.withoutArtifactUpload).map(uploadLambdaArtifact),
            autoscalingGroups.map(uploadAutoscalingArtifact),
          ].flat();
          artifactUploads.forEach(({ name, props }) => deployments.set(name, props));

          const parentStacks: RiffRaffDeployment[] = getGuStackDependencies(stack).map((x) =>
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

          // only add the `amiParametersToTags` property if there are some ASGs in the stack
          if (autoscalingGroups.length > 0) {
            updateDeploymentParameters(deployments, cfnDeployment, {
              amiParametersToTags: getAmiParameters(autoscalingGroups),
            });
          }

          /*
          At this point, `stacks` is a collection of similar `GuStack`s that differ only by their `stage`.
          We're about to add `minInstancesInServiceParameters` to assist Riff-Raff when deploying ASGs with scaling policies.
          This is driven by the presence of conditionally added CFN Parameters.
          To support the possibility of there being a scaling policy in PROD but not CODE, look at all the CFN Parameters in `stacks`.
           */
          const minInstancesInServiceParameters: Map<string, GuAsgMinInstancesInServiceParameterExperimental> = stacks
            .flatMap((stack) => Object.values(stack.parameters))
            .filter(
              (_): _ is GuAsgMinInstancesInServiceParameterExperimental =>
                _ instanceof GuAsgMinInstancesInServiceParameterExperimental,
            )
            .reduce((acc, item) => {
              if (!acc.has(item.node.id)) {
                acc.set(item.node.id, item);
              }
              return acc;
            }, new Map<string, GuAsgMinInstancesInServiceParameterExperimental>());

          /**
           * Only add the `minInstancesInServiceParameters` property if there are some ASGs affected by {@link GuHorizontallyScalingDeploymentPropertiesExperimental}.
           */
          if (minInstancesInServiceParameters.size > 0) {
            updateDeploymentParameters(deployments, cfnDeployment, {
              minInstancesInServiceParameters: getMinInstancesInServiceParameters(minInstancesInServiceParameters),
            });
          }
        });
      });
    });

    if (missingStacks.length > 0) {
      const message = `Unable to produce a working riff-raff.yaml file; missing ${missingStacks.length} definitions`;
      console.log(`${message} (details below)`);
      console.table(missingStacks);

      throw new Error(message);
    }

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
