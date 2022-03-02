import { readFileSync } from "fs";
import { stdin, stdout } from "process";
import { createInterface } from "readline";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { App } from "@aws-cdk/core";
import AWS from "aws-sdk";
import type { CreateStackInput } from "aws-sdk/clients/cloudformation";
import chalk from "chalk";
import type { SsmParameterPath } from "../../../constants/ssm-parameter-paths";
import { GuStack } from "../../../constructs/core";
import type { GuStackProps } from "../../../constructs/core";
import type { AwsAccountReadiness } from "../../../types/cli";

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
  const stack = await ask(
    "Enter a Guardian stack, used to tag resources (e.g. 'frontend' - typically the same as your Janus profile)\n >> "
  );

  console.log("Next, we will create some SSM parameters, which are used by @guardian/cdk patterns and constructs.");
  console.log();

  const populatedParameters = await mapInOrder(parameters, async (p) => {
    const answer = await ask(
      `Path: ${chalk.bold(p.path)}\nDescription: ${p.description}\n${
        p.namingPattern ? `Naming convention: ${p.namingPattern}\n` : ""
      }Set *value* of this SSM parameter to >> `
    );
    return { value: answer, ...p };
  });

  const app = new App();
  new AccountBootstrap(app, "CDKBoostrap", { stack, parameters: populatedParameters });

  const assembly = app.synth();
  const tplFile = assembly.stacks[0].templateFullPath; // Cloud assemblies can contain multiple stacks but in this case we know there is only one.
  return readFileSync(tplFile, "utf-8");
};

export const createBootstrapStack = (
  { credentialProvider, region }: AwsAccountReadiness,
  template: string
): Promise<string> => {
  const cfn = new AWS.CloudFormation({
    credentialProvider,
    region,
  });

  const input: CreateStackInput = {
    StackName: "cdk-bootstrap-INFRA",
    TemplateBody: template,
    EnableTerminationProtection: true,
  };

  return cfn
    .createStack(input)
    .promise()
    .then((res) => {
      if (res.$response.error) {
        return `Stack creation failed: ${res.$response.error.message}`;
      }

      return res.StackId ?? "STACK ID UNDEFINED";
    });
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
