import { executeSync } from "./exec";

export function gitRemoteOriginUrl(): string {
  return executeSync("git", ["config", "--get", "remote.origin.url"], {
    cwd: process.cwd(),
  });
}

export function gitRootOrCwd(): string {
  const cwd = process.cwd();

  try {
    return executeSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
    });
  } catch (err) {
    console.warn(`Failed to identify a git repository. Falling back to CWD ${cwd}`);
    return cwd;
  }
}
