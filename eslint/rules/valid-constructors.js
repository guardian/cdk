const { isGuParameter, parseGuParameterConstructor } = require("../logic/gu-parameter-constructors");
const { parseOtherConstructors } = require("../logic/other-constructors");

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "ensure constructors conform with agreed pattern",
      category: "Best Practices",
      url: "https://github.com/guardian/cdk/blob/main/docs/architecture-decision-records/002-component-constuctors.md",
    },
    schema: [],
  },

  create(context) {
    return {
      MethodDefinition: function (node) {
        if (node.kind !== "constructor") return null;

        if (isGuParameter(node)) {
          return parseGuParameterConstructor(context, node);
        }

        return parseOtherConstructors(context, node);
      },
    };
  },
};
