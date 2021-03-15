const { readdirSync } = require("fs");

const constructsDir = "src/constructs";
const utilsDir = "src/utils";

function getEntryPointsFromSubdirectories(directory) {
  return readdirSync(directory).map((dir) => `${directory}/${dir}/index.ts`);
}

module.exports = {
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
