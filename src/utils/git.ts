import { executeSync } from "./exec";

export function gitRemoteOriginUrl(): string {
  return executeSync("git", ["config", "--get", "remote.origin.url"], {
    cwd: process.cwd(),
  });
}

/**
 * Extract the `owner/repo` full name from a git remote URL.
 *
 * Supports HTTPS, SSH shorthand (`git@host:owner/repo`), and `ssh://` URLs.
 */
export function gitRepoFullName(url: string): string {
  const match = /([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(url);
  if (!match?.[1]) {
    throw new Error(`Unable to parse git URL: ${url}`);
  }
  return match[1];
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
