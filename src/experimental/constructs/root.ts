import type { StageSynthesisOptions } from "aws-cdk-lib";
import { App } from "aws-cdk-lib";
import type { CloudAssembly } from "aws-cdk-lib/cx-api";
import { RiffRaffYamlFileExperimental } from "../riff-raff-yaml-file";

export class GuRootExperimental extends App {
  override synth(options?: StageSynthesisOptions): CloudAssembly {
    new RiffRaffYamlFileExperimental(this).synth();
    return super.synth(options);
  }
}
