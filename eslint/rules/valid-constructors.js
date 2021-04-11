/*
RULES
1. Private constructors don't get linted
2. Must be 1, 2 or 3 parameters
3. First parameter must be called scope
4. First parameter must be of type GuStack
5. If 2 parameters:
   - The second parameter must be called props
   - The second parameter must be a custom type
6. If 3 parameters:
   - The second parameter must be called id
   - The second parameter must be of type string
   - The third parameter must be called props
   - The third parameter must be a custom type
7. Only the third parameter can be optional or have a default value

See `valid-constructors.test.ts` and `npm run test:custom-lint-rule`

TODO: If all values in third type are optional then parameter should be optional
 */

const NO_LINT_ERRORS = null;

const lintParameter = (param, node, context, { name, type, allowOptional, allowDefault, position }) => {
  const hasDefault = param.type === "AssignmentPattern";
  if (hasDefault && !allowDefault) {
    return context.report({
      node,
      loc: param.loc,
      message: `The ${position} parameter in a constructor cannot have a default`,
    });
  }

  const isOptional = param.optional;
  if (isOptional && !allowOptional) {
    return context.report({
      node,
      loc: param.loc,
      message: `The ${position} parameter in a constructor cannot be optional`,
    });
  }

  const currentName = param.name ?? param.left?.name ?? param.argument.name;

  if (currentName !== name) {
    return context.report({
      node,
      loc: param.loc,
      message: `The ${position} parameter in a constructor must be called ${name} (currently ${currentName})`,
    });
  }

  const tsType = param.typeAnnotation?.typeAnnotation.type ?? param.left.typeAnnotation.typeAnnotation.type;
  const customType =
    param.typeAnnotation?.typeAnnotation.typeName?.name ?? param.left?.typeAnnotation.typeAnnotation.typeName.name;

  const currentType = type.startsWith("TS") ? tsType : customType;

  if (currentType !== type) {
    return context.report({
      node,
      loc: param.typeAnnotation.loc,
      message: `The ${position} parameter in a constructor must be of type ${type} (currently ${currentType})`,
    });
  }
};

const scopeParamSpec = {
  name: "scope",
  type: "GuStack",
  allowOptional: false,
  allowDefault: false,
  position: "first",
};

const idParamSpec = {
  name: "id",
  type: "TSStringKeyword",
  allowOptional: false,
  allowDefault: false,
  position: "second",
};

const propsAsSecondParamSpec = {
  name: "props",
  type: "TSTypeReference",
  allowOptional: false,
  allowDefault: false,
  position: "second",
};

const propsAsThirdParamSpec = {
  name: "props",
  type: "TSTypeReference",
  allowOptional: true,
  allowDefault: true,
  position: "third",
};

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
      MethodDefinition(node) {
        if (node.kind !== "constructor") return NO_LINT_ERRORS;
        if (node.accessibility === "private") return NO_LINT_ERRORS;

        const params = node.value.params;

        if (!Array.isArray(params)) {
          return context.report({
            node,
            message: "Constructors must take at least one parameter",
            loc: params.loc,
          });
        }

        switch (params.length) {
          case 1: {
            const [scope] = params;
            return lintParameter(scope, node, context, scopeParamSpec) ?? NO_LINT_ERRORS;
          }
          case 2: {
            const [scope, props] = params;

            return (
              lintParameter(scope, node, context, scopeParamSpec) ??
              lintParameter(props, node, context, propsAsSecondParamSpec) ??
              NO_LINT_ERRORS
            );
          }
          case 3: {
            const [scope, id, props] = params;

            return (
              lintParameter(scope, node, context, scopeParamSpec) ??
              lintParameter(id, node, context, idParamSpec) ??
              lintParameter(props, node, context, propsAsThirdParamSpec) ??
              NO_LINT_ERRORS
            );
          }
          default:
            return context.report({
              node,
              message: `Constructors can take a maximum of three parameters - there are ${params.length} params here!`,
              loc: params.loc,
            });
        }
      },
    };
  },
};
