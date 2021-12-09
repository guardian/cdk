const { readdirSync } = require("fs");

const constructsDir = "src/constructs";
const utilsDir = "src/utils";

function getEntryPointsFromSubdirectories(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((dir) => dir.isDirectory())
    .map(({ name }) => `${directory}/${name}/index.ts`);
}

module.exports = {
  entryPoints: [
    "src/patterns/index.ts",
    "src/constants/index.ts",
    ...getEntryPointsFromSubdirectories(constructsDir),
    ...getEntryPointsFromSubdirectories(utilsDir),
  ],
  out: "target",
  includeVersion: true,
  readme: "docs/001-general-usage.md",
};
