import type { StageSynthesisOptions } from "aws-cdk-lib";
import { App } from "aws-cdk-lib";
import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import { RiffRaffYamlFile } from "../../utils/riff-raff-yaml-file";

// Deliberately not called `GuApp` as `app` is overloaded (as is `stack`, and `stage` 😅)
export class GuRoot extends App {
  override synth(options?: StageSynthesisOptions): CloudAssembly {
    new RiffRaffYamlFile(this).synth();
    return super.synth(options);
  }
}
