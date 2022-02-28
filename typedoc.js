const { readdirSync, existsSync } = require("fs");

const constructsDir = "src/constructs";
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
    "src/index.ts",
    "src/constants/index.ts",
    // we purposefully do not have an index.ts in `src/constructs` or `src/utils`
    ...getEntryPointsFromSubdirectories(constructsDir),
    ...getEntryPointsFromSubdirectories(utilsDir),
  ],
  out: "target",
  includeVersion: true,
  readme: "docs/001-general-usage.md",
};
