import type { StageSynthesisOptions } from "aws-cdk-lib";
import { App } from "aws-cdk-lib";
import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import { RiffRaffYamlFileExperimental } from "../riff-raff-yaml-file";

/**
 * A replacement for `App`, sitting at the root of a CDK application.
 * `GuRootExperimental` will synthesise a `riff-raff.yaml` file for a CDK application.
 *
 * Usage is a case of updating `/<repo-root>/cdk/bin/cdk.ts` from:
 *
 * ```ts
 * import { App } from "aws-cdk-lib";
 *
 * const app = new App();
 *
 * new MyStack(app, "my-stack-CODE", {});
 * new MyStack(app, "my-stack-PROD", {});
 * ```
 * To:
 *
 * ```ts
 * import { GuRootExperimental } from "@guardian/cdk/lib/experimental/constructs/root";
 *
 * const app = new GuRootExperimental();
 *
 * new MyStack(app, "my-stack-CODE", {});
 * new MyStack(app, "my-stack-PROD", {});
 * ```
 */
export class GuRootExperimental extends App {
  override synth(options?: StageSynthesisOptions): CloudAssembly {
    new RiffRaffYamlFileExperimental(this).synth();
    return super.synth(options);
  }
}
