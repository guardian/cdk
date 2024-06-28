import type { CfnComponentProps } from "aws-cdk-lib/aws-imagebuilder";
import { CfnComponent } from "aws-cdk-lib/aws-imagebuilder";
import { dump } from "js-yaml";
import type { GuStack } from "../core";

type GuComponentStepBase = {
  name: string;
};

type GuComponentStepExecuteBash = GuComponentStepBase & {
  action: "ExecuteBash";
  inputs: {
    commands: string[];
  };
};

type GuComponentStepExecuteBinary = GuComponentStepBase & {
  action: "ExecuteBinary";
  inputs: {
    path: string;
    arguments?: string[];
  };
};

type GuComponentStep = GuComponentStepExecuteBash | GuComponentStepExecuteBinary;

type GuComponentPhase = {
  name: "build" | "validate" | "test";
  steps: GuComponentStep[];
};

export type GuComponentProps = CfnComponentProps & {
  phases: GuComponentPhase[];
};

export class GuComponent extends CfnComponent {
  constructor(scope: GuStack, id: string, props: GuComponentProps) {
    const { name, description, phases } = props;

    const data = dump({
      name,
      description,
      schemaVersion: 1,
      phases,
    });

    super(scope, id, {
      ...props,
      data,
    });
  }
}
