import camelCase from "lodash.camelcase";
import kebabCase from "lodash.kebabcase";
import upperFirst from "lodash.upperfirst";

export const toPascalCase = (str: string): string => {
  return upperFirst(camelCase(str));
};

export const toKebabCase = (str: string): string => {
  return kebabCase(str);
};
