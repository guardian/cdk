/*
RULES:
1. Un-exported classes don't get linted
2. Class name must end with 'Experimental'

The rule is applied to the `experimental` directory. See `.eslintrc.js`.

See ../../../docs/architecture-decision-records/005-x01-package-structure.md
 */

const NO_LINT_ERRORS = null;

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Signal (potential) un-stability to consumers",
      category: "Best Practices",
      url: "https://github.com/guardian/cdk/blob/main/docs/architecture-decision-records/005-x01-package-structure.md",
    },
    schema: [],
  },

  create(context) {
    return {
      ClassDeclaration(node) {
        const isExported = node.parent.type === "ExportNamedDeclaration";

        if (!isExported) {
          return NO_LINT_ERRORS;
        }

        const className = node.id.name;
        const isClassNameExperimental = className.endsWith("Experimental");

        if (isClassNameExperimental) {
          return NO_LINT_ERRORS;
        }

        return context.report({
          node,
          message: `Exported classes should end with 'Experimental' to signal its (potential) un-stability. Rename ${className} to ${className}Experimental.`,
          loc: node.loc,
        });
      },
    };
  },
};
