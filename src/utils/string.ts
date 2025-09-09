import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";

export const toPascalCase = (str: string): string => {
  return upperFirst(camelCase(str));
};

export const toKebabCase = (str: string): string => {
  return str
    .replace(/[_\s]+/g, "-") // Replace underscores and spaces with dashes
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2") // Insert a dash before uppercase letters (except at the start)
    .toLowerCase();
};
