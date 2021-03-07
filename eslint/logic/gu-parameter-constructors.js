/*
Rules for GuParameters:
1. Must be defined in the parameters directory
2. Constructors must take one parameter called scope and be of type GuStack
 */

const guParameterSuperClassRegex = new RegExp("^Gu[A-Za-z]*Parameter$");
const guParameterDirectory = "src/constructs/core/parameters";
const guParameterDirectoryRegex = new RegExp(`${guParameterDirectory}/.+\.ts$`);

const isGuParameter = (node) => {
  const superClass = node.parent?.parent?.superClass?.name;
  return superClass ? guParameterSuperClassRegex.test(superClass) : false;
};

const parseGuParameterConstructor = (context, node) => {
  const isInCorrectLocation = guParameterDirectoryRegex.test(context.getFilename());
  if (!isInCorrectLocation) {
    return context.report({
      node,
      message: `GuParameters must be defined in the directory ${guParameterDirectory}`,
    });
  }

  const { params } = node.value;

  const hasMultipleParameters = !Array.isArray(params) || params.length !== 1;
  if (hasMultipleParameters) {
    return context.report({
      node,
      message: "GuParameter constructors must only take one parameter",
      loc: params.loc,
    });
  }

  const [scope] = params;

  const scopeParamIsCorrectName = scope.name === "scope";
  if (!scopeParamIsCorrectName) {
    return context.report({
      node,
      message: "The parameter in a GuParameter constructor must be called scope",
      loc: scope.loc,
    });
  }

  const scopeParamIsCorrectType = scope.typeAnnotation.typeAnnotation.typeName.name === "GuStack";
  if (!scopeParamIsCorrectType) {
    return context.report({
      node,
      message: "The parameter in a GuParameter constructor must be of type GuStack",
      loc: scope.loc,
    });
  }

  return null;
};

module.exports = {
  isGuParameter,
  parseGuParameterConstructor,
};
