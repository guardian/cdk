import { CfnParameter } from "aws-cdk-lib";
import type { CfnParameterProps } from "aws-cdk-lib";
import { RegexPattern } from "../../../constants";
import type { GuApp } from "../app";

export interface GuParameterProps extends CfnParameterProps {
  fromSSM?: boolean;
}

export type GuNoTypeParameterProps = Omit<GuParameterProps, "type">;

export class GuParameter extends CfnParameter {
  public readonly id: string;

  constructor(scope: GuApp, id: string, props: GuParameterProps) {
    super(scope, id, {
      ...(props.fromSSM && { default: `/$STAGE/$STACK/$APP/parameter` }), // TODO use values from `scope`?
      ...props,
      type: props.fromSSM ? `AWS::SSM::Parameter::Value<${props.type ?? "String"}>` : props.type,
    });

    this.id = id;
  }
}

export class GuStringParameter extends GuParameter {
  constructor(scope: GuApp, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, { ...props, type: "String" });
  }
}

export class GuArnParameter extends GuStringParameter {
  constructor(scope: GuApp, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      allowedPattern: RegexPattern.ARN,
      constraintDescription: "Must be a valid ARN, eg: arn:partition:service:region:account-id:resource-id",
    });
  }
}
