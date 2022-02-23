import { readFileSync, writeFileSync } from "fs";
import { stdin, stdout } from "process";
import { createInterface } from "readline";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { App } from "@aws-cdk/core";
import { dump } from "js-yaml";
import type { SsmParameterPath } from "../../../constants/ssm-parameter-paths";
import { GuStack } from "../../../constructs/core";
import type { GuStackProps } from "../../../constructs/core";

interface PopulatedParameter extends SsmParameterPath {
  value: string;
}

interface BootstrapProps extends GuStackProps {
  parameters: PopulatedParameter[];
}

class AccountBootstrap extends GuStack {
  migratedFromCloudFormation = true;

  constructor(scope: App, id: string, props: BootstrapProps) {
    super(scope, id, props);

    this.templateOptions.description = `CDK Bootstrap template used to manage required SSM parameters and other resources.`;

    props.parameters.forEach((p) => {
      new StringParameter(this, p.path, {
        description: p.description,
        parameterName: p.path,
        stringValue: p.value,
      });
    });
  }
}

export const accountBootstrapCfn = async (parameters: SsmParameterPath[]): Promise<string> => {
  const stack = await ask("Guardian stack to tag resources with (e.g. 'frontend') >> ");

  const populatedParameters = await mapInOrder(parameters, async (p) => {
    const answer = await ask(
      `Path ${p.path}\nDescription: ${p.description}\n${
        p.namingPattern ? `Naming convention: ${p.namingPattern}\n` : ""
      }Set as >> `
    );
    return { value: answer, ...p };
  });

  const app = new App();
  new AccountBootstrap(app, "CDKBoostrap", { stack, parameters: populatedParameters });

  const assembly = app.synth();
  const tplFile = assembly.stacks[0].templateFullPath; // Cloud assemblies can contain multiple stacks but in this case we know there is only one.
  const tpl = readFileSync(tplFile, "utf-8");
  const tplYaml = dump(JSON.parse(tpl));
  return tplYaml;
};

export const writeBootrapCfn = (tpl: string): string => {
  writeFileSync("cdk-bootstrap-INFRA.yaml", tpl);
  return "cdk-bootstrap-INFRA.yaml";
};

const ask = async (question: string): Promise<string> => {
  const rl = createInterface(stdin, stdout);
  const answer = new Promise<string>((resolve) => {
    rl.question(question, (response) => {
      rl.close();
      console.log();
      resolve(response);
    });
  });

  return answer;
};

const mapInOrder = <A, B>(seq: A[], fn: (item: A) => Promise<B>): Promise<B[]> => {
  const loop = (seq: A[], acc: B[]): Promise<B[]> => {
    if (seq.length < 1) {
      return Promise.resolve(acc);
    }

    return fn(seq[0]).then((output) => loop(seq.slice(1), acc.concat(output)));
  };

  return loop(seq, []);
};
