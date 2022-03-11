import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";

export const pascalCase = (str: string): string => {
  return upperFirst(camelCase(str));
};

export interface Name {
  kebab: string;
  pascal: string;
}
