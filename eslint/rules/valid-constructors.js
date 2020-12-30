// Rules
// 1. Must be at least 2 parameters
// 2. Can't be more than 3 parameters
// 3. First parameter must be called scope
// 4. First parameter must be of type GuStack
// 5. Second parameter must be called id
// 6. Second parameter must be of type string
// 7. Third parameter (if exists) must called props
// 8. If third parameter is present and non-optional then the second parameter should not be initialised
// TODO: 9. If all values in third type are optional then parameter should be optional
// 10. Third parameter type should be custom

const getPath = (node, path) => {
  const keys = path.split(".");
  let value = node;

  for (const key of keys) {
    if (!value) break;
    value = value[key];
  }

  return value;
};

const getStandardOrLeftProp = (node, path) => {
  switch (node.type) {
    case "Identifier":
      return getPath(node, path);
    case "AssignmentPattern":
      return getPath(node, `left.${path}`);
    default:
      return false;
  }
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
        if (node.kind !== "constructor") return null;

        const params = node.value.params;

        // 1. Must be at least 2 parameters
        if (!Array.isArray(params) || params.length < 2) {
          return context.report(
            node,
            params.loc,
            "Construct or pattern constructors must take at least a scope and an id parameter"
          );
        }

        // 2. Can't be more than 3 parameters
        if (params.length > 3) {
          return context.report(
            node,
            params.loc,
            "Construct or pattern constructors can only take scope, id and props parameters"
          );
        }

        const scope = params[0];

        // 3. First parameter must be called scope
        if (scope.name !== "scope") {
          return context.report(
            node,
            scope.loc,
            `The first parameter in a construct or pattern contructor must be called scope`
          );
        }

        // 4. First parameter must be of type GuStack
        if (scope.typeAnnotation.typeAnnotation.typeName.name !== "GuStack") {
          return context.report(
            node,
            scope.typeAnnotation.loc,
            `The first parameter in a construct or pattern contructor must be of type GuStack`
          );
        }

        const id = params[1];

        // 5. Second parameter must be called id
        if (getStandardOrLeftProp(id, "name") !== "id") {
          return context.report(
            node,
            id.loc,
            `The second parameter in a construct or pattern contructor must be called id`
          );
        }

        // 6. Second parameter must be of type string
        if (getStandardOrLeftProp(id, "typeAnnotation.typeAnnotation.type") !== "TSStringKeyword") {
          return context.report(
            node,
            getStandardOrLeftProp(id, "typeAnnotation.loc"),
            `The second parameter in a construct or pattern contructor must be of type string`
          );
        }

        const props = params[2];

        if (props) {
          // 7. Third parameter (if exists) must called props
          if (getStandardOrLeftProp(props, "name") !== "props") {
            return context.report(
              node,
              props.loc,
              `The third parameter in a construct or pattern contructor must be called props`
            );
          }

          // 10. Third parameter type should be custom
          if (getStandardOrLeftProp(props, "typeAnnotation.typeAnnotation.type") !== "TSTypeReference") {
            return context.report(
              node,
              getStandardOrLeftProp(props, "typeAnnotation.loc"),
              `The third parameter in a construct or pattern contructor must be a custom type`
            );
          }

          // 8. If third parameter is present and non-optional then the second parameter should not be initialised
          if (props.type !== "AssignmentPattern" && !props.optional && id.type === "AssignmentPattern") {
            return context.report(
              node,
              id.loc,
              `The second parameter cannot be initialised if there is a non-optional third parameter`
            );
          }
        }

        return null;
      },
    };
  },
};
