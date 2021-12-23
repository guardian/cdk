/* eslint-disable -- copied from https://github.com/aws/aws-cdk/blob/eda1640fcaf6375d7edc5f8edcb5d69c82d130a1/packages/aws-cdk/lib/init.ts#L381-L404 */

import childProcess from "child_process";

export async function execute(
  cmd: string,
  args: string[],
  { cwd }: { cwd: string }
): Promise<string> {
  const child = childProcess.spawn(cmd, args, {
    cwd,
    shell: true,
    stdio: ["ignore", "pipe", "inherit"],
  });

  let stdout = "";
  child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
  return new Promise<string>((ok, fail) => {
    child.once("error", (err) => fail(err));
    child.once("exit", (status) => {
      if (status === 0) {
        return ok(stdout);
      } else {
        process.stderr.write(stdout);
        return fail(new Error(`${cmd} exited with status ${status}`));
      }
    });
  });
}
