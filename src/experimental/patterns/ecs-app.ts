import type { GuStack } from "../../constructs/core";
import type { GuEc2AppProps } from "../../patterns";
import { GuEc2App } from "../../patterns";

interface GUEcsAppProps extends GuEc2AppProps {
  /**
   * Which application build to run.
   * This will typically match the build number provided by CI.
   *
   * @example
   * process.env.GITHUB_RUN_NUMBER
   */
  buildIdentifier: string;
}

export class GuEcsAppExperimental extends GuEc2App {
  constructor(scope: GuStack, props: GUEcsAppProps) {
    super(scope, props);
  }
}
