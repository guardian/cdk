import type { GuAutoScalingGroup } from "../../constructs/autoscaling";
import type { CdkStacksDifferingOnlyByStage, RiffRaffDeployment, RiffRaffDeploymentParameters } from "../types";

export function cloudFormationDeployment(
  cdkStacks: CdkStacksDifferingOnlyByStage,
  dependencies: RiffRaffDeployment[],
  contentDirectory: string,
): RiffRaffDeployment {
  // The stacks in `cdkStacks` only differ by stage, so we can just use the first item in the list for key information.
  const [cdkStack] = cdkStacks;

  if (!cdkStack) {
    throw new Error("Unable to produce a working riff-raff.yaml file; there are no stacks!");
  }

  const {
    region,
    stack,
    constructor: { name },
  } = cdkStack;

  // TODO remove `lodash.kebabcase` dep as it's not that much code to kebab-ise a string...
  const kebabClassName = name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

  const templateStagePaths = cdkStacks.reduce(
    (acc, { stage, templateFile }) => ({
      ...acc,
      [stage]: templateFile,
    }),
    {},
  );

  return {
    name: ["cfn", region, stack, kebabClassName].join("-"),
    props: {
      type: "cloud-formation",
      regions: new Set([region]),
      stacks: new Set([stack]),
      app: kebabClassName,
      contentDirectory,
      parameters: {
        templateStagePaths,
      },
      // only add the `dependencies` property if there are some
      ...(dependencies.length > 0 && { dependencies: dependencies.map(({ name }) => name) }),
    },
  };
}

export function getAmiParameters(autoScalingGroups: GuAutoScalingGroup[]): RiffRaffDeploymentParameters {
  return autoScalingGroups.reduce<RiffRaffDeploymentParameters>((acc, asg) => {
    const { imageRecipe, app, amiParameter } = asg;

    if (!imageRecipe) {
      throw new Error(`Unable to produce a working riff-raff.yaml file; imageRecipe missing from ASG ${app}`);
    }

    const Recipe = typeof imageRecipe === "string" ? imageRecipe : imageRecipe.Recipe;
    const AmigoStage = typeof imageRecipe === "string" ? "PROD" : (imageRecipe.AmigoStage ?? "PROD");

    // In YAML `true` is a Boolean. Riff-Raff expects a String here, so call `toString` to make it `'true'`.
    const Encrypted = (typeof imageRecipe === "string" ? true : (imageRecipe.Encrypted ?? true)).toString();

    return {
      ...acc,
      [amiParameter.node.id]: {
        BuiltBy: "amigo",
        AmigoStage,
        Recipe,
        Encrypted,
      },
    };
  }, {});
}
