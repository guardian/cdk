import type { CdkStacksDifferingOnlyByStage, RiffRaffDeployment } from "../types";

export function cloudFormationDeployment(
  cdkStacks: CdkStacksDifferingOnlyByStage,
  dependencies: RiffRaffDeployment[],
  contentDirectory: string
): RiffRaffDeployment {
  if (cdkStacks.length === 0) {
    throw new Error("Unable to produce a working riff-raff.yaml file; there are no stacks!");
  }

  // The stacks in `cdkStacks` only differ by stage, so we can just use the first item in the list for key information.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- length of `cdkStacks` is checked above
  const cdkStack = cdkStacks[0]!;
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
    {}
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
