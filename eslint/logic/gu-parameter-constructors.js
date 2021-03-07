/*
The rules:

1. Must be defined in the parameters directory
2. Constructor parameters must not have a default
3. Constructor parameters must not be optional

If a direct extension of GuParameter:
  Constructors must take three parameters:
    1. First parameter must be called scope and be of type GuStack
    2. Second parameter must be called id and be of type TSStringKeyword
    3. Third parameter must be called id and be of type GuNoTypeParameterProps
Else:
  Constructors must take one parameter called scope and be of type GuStack
 */

const guParameterSuperClassRegex = new RegExp("^Gu[A-Za-z]*Parameter$");
const guParameterDirectory = "src/constructs/core/parameters";
const guParameterDirectoryRegex = new RegExp(`${guParameterDirectory}/.+\.ts$`);

const isGuParameter = (node) => {
  const superClass = node.parent?.parent?.superClass?.name;
  return superClass ? guParameterSuperClassRegex.test(superClass) : false;
};

const directlyExtendsGuParameter = (node) => {
  return node.parent?.parent?.superClass?.name === "GuParameter";
};

const parseDirectExtensionOfGuParameter = (context, node) => {
  const { params } = node.value;

  const hasExactlyThreeParams = !Array.isArray(params) || params.length === 3;
  if (!hasExactlyThreeParams) {
    return context.report({
      node,
      message: "Constructors of classes that extend GuParameter must take exactly three parameters",
      loc: params.loc,
    });
  }

  params.forEach((param) => {
    if (param.type === "AssignmentPattern") {
      return context.report({
        node,
        message: "Parameters to constructors of classes that extend GuParameter must not have a default",
        loc: param.loc,
      });
    }

    if (param.optional) {
      return context.report({
        node,
        message: "Parameters to constructors of classes that extend GuParameter must not be optional",
        loc: param.loc,
      });
    }
  });

  const paramSpec = [
    { expectedName: "scope", expectedType: "GuStack", humanReadablePosition: "first" },
    { expectedName: "id", expectedType: "TSStringKeyword", humanReadablePosition: "second" },
    { expectedName: "props", expectedType: "GuNoTypeParameterProps", humanReadablePosition: "third" },
  ];

  paramSpec.forEach((spec, index) => {
    const param = params[index];

    if (param.name !== spec.expectedName) {
      return context.report({
        node,
        message: `The ${spec.humanReadablePosition} parameter of classes that extend GuParameter must be called ${spec.expectedName}`,
        loc: param.loc,
      });
    }

    const paramType = param.typeAnnotation.typeAnnotation.typeName?.name ?? param.typeAnnotation.typeAnnotation.type;

    if (paramType !== spec.expectedType) {
      return context.report({
        node,
        message: `The ${spec.humanReadablePosition} parameter of classes that extend GuParameter must be of type ${spec.expectedType}`,
        loc: param.loc,
      });
    }
  });

  return null;
};

const parseOtherGuParameter = (context, node) => {
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

  const hasDefault = scope.type === "AssignmentPattern";
  if (hasDefault) {
    return context.report({
      node,
      message: "Parameters to constructors of classes that extend GuParameter must not have a default",
      loc: scope.loc,
    });
  }

  if (scope.optional) {
    return context.report({
      node,
      message: "Parameters to constructors of classes that extend GuParameter must not be optional",
      loc: scope.loc,
    });
  }

  const scopeParamIsCorrectName = scope.name === "scope";
  if (!scopeParamIsCorrectName) {
    return context.report({
      node,
      message: "The first parameter in a GuParameter constructor must be called scope",
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

const parseGuParameterConstructor = (context, node) => {
  const isInCorrectLocation = guParameterDirectoryRegex.test(context.getFilename());
  if (!isInCorrectLocation) {
    return context.report({
      node,
      message: `GuParameters must be defined in the directory ${guParameterDirectory}`,
    });
  }

  return directlyExtendsGuParameter(node)
    ? parseDirectExtensionOfGuParameter(context, node)
    : parseOtherGuParameter(context, node);
};

module.exports = {
  isGuParameter,
  parseGuParameterConstructor,
};
