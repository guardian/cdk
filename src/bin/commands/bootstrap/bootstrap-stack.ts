import { readFileSync } from "fs";
import { StringParameter } from "@aws-cdk/aws-ssm";
import { App } from "@aws-cdk/core";
import AWS from "aws-sdk";
import type { CreateStackInput } from "aws-sdk/clients/cloudformation";
import chalk from "chalk";
import { prompt } from "inquirer";
import type { Question } from "inquirer";
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
  // Inquirer interprets '.' in question names as a special character, so let's
  // replace it.
  const safeName = (name: string): string => name.replaceAll(".", "-");

  const stackQ: Question = {
    type: "string",
    name: "stack",
    message:
      "Enter a Guardian stack, used to tag resources (e.g. 'frontend' - typically the same as your Janus profile)",
  };

  const paramQuestions: Question[] = parameters.map((param) => {
    return {
      type: "string",
      name: safeName(param.path),
      message: `Set param ${param.path} to`,
    };
  });

  console.log(
    chalk.green(
      `@guardian/cdk Bootstrap will create a Cloudformation stack containing various resources used by library patterns and constructs.\n`
    )
  );

  console.log(
    chalk.green(
      `For documentation on @guardian/cdk SSM Parameters see: ${chalk.underline(
        "https://github.com/guardian/cdk/blob/main/src/constants/ssm-parameter-paths.ts#L9"
      )}.\n`
    )
  );

  const questions = [stackQ].concat(paramQuestions);
  const answers = await prompt(questions);

  console.log(JSON.stringify(answers));

  const populatedParameters = parameters.map((param) => ({ value: answers[safeName(param.path)] as string, ...param }));

  const cfnStackName = "CDKBoostrap";
  const app = new App();
  new AccountBootstrap(app, cfnStackName, { stack: answers["stack"] as string, parameters: populatedParameters });

  const assembly = app.synth();
  const tplFile = assembly.getStackByName(cfnStackName).templateFullPath; // Cloud assemblies can contain multiple stacks but in this case we know there is only one.
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
