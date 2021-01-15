const { readdirSync } = require("fs");

const constructsDir = "src/constructs";

module.exports = {
  entryPoints: [
    "src/index.ts",
    "src/constants/index.ts",
    "src/utils/index.ts",

    // we purposefully do not have an index.ts in `src/constructs` to encourage usage of patterns
    // list sub directories for tsdoc to generate documentation for the constructs
    ...readdirSync(constructsDir).map((dir) => `${constructsDir}/${dir}/index.ts`),
  ],
  out: "target",
  includeVersion: true,
  readme: "docs/001-general-usage.md",
};
