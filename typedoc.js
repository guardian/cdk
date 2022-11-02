const { readdirSync, existsSync } = require("fs");

const constructsDir = "src/constructs";
const experimentalDir = "src/experimental";
const utilsDir = "src/utils";

function getEntryPointsFromSubdirectories(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map(({ name }) => `${directory}/${name}/index.ts`)
    .filter((file) => existsSync(file));
}

module.exports = {
  exclude: "src/**/*.test.ts",
  entryPoints: [
    "src/patterns/index.ts",
    "src/constants/index.ts",
    "src/types/index.ts",
    // we purposefully do not have an index.ts in `src/constructs`, `src/experimental` or `src/utils`
    ...getEntryPointsFromSubdirectories(constructsDir),
    ...getEntryPointsFromSubdirectories(experimentalDir),
    ...getEntryPointsFromSubdirectories(utilsDir),
  ],
  out: "target",
  includeVersion: true,
  readme: "README.md",
};
