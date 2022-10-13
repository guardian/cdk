import camelCase from "lodash.camelcase";
import upperFirst from "lodash.upperfirst";
import { execute } from "../../../../utils/exec";
import type { PackageManager } from "../index";

export const pascalCase = (str: string): string => {
  return upperFirst(camelCase(str));
};

export interface Name {
  kebab: string;
  pascal: string;
}

async function runTask(packageManager: PackageManager, cwd: string, task: string): Promise<string> {
  return await execute(`${packageManager} ${task}`, [], { cwd });
}

export function getCommands(
  packageManager: PackageManager,
  cwd: string
): {
  installDependencies: () => Promise<string>;
  lint: () => Promise<string>;
  synth: () => Promise<string>;
  test: () => Promise<string>;
} {
  return {
    installDependencies: () => runTask(packageManager, cwd, "install"),
    lint: () => runTask(packageManager, cwd, "run lint"),
    test: () => runTask(packageManager, cwd, "test -- -u"),
    synth: () => runTask(packageManager, cwd, "run synth"),
  };
}
