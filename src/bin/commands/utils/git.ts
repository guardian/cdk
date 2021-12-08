import chalk from "chalk";
import cli from "cli-ux";
import { execute } from "./exec";

export async function gitRootOrCwd(): Promise<string> {
  cli.action.start(chalk.yellow("Determining git repository root directory to write into"));
  try {
    const gitRoot = await execute("git", ["rev-parse", "--show-toplevel"], {
      cwd: process.cwd(),
    });
    cli.action.stop(`Success! It is ${chalk.green(gitRoot)}`);
    return gitRoot.trim();
  } catch (e) {
    cli.action.stop(`Failed to identify a git repository. Falling back to CWD ${chalk.green(process.cwd())}`);
    return Promise.resolve(process.cwd());
  }
}
