import { CfnParameter } from "aws-cdk-lib";
import type { CfnParameterProps } from "aws-cdk-lib";
import { RegexPattern } from "../../../constants";
import type { AppIdentity } from "../identity";
import type { GuStack } from "../stack";

export interface GuParameterProps extends CfnParameterProps {
  fromSSM?: boolean;
}

export type GuNoTypeParameterProps = Omit<GuParameterProps, "type">;
export type GuNoTypeParameterPropsWithAppIdentity = Omit<GuParameterProps, "type"> & AppIdentity;

export class GuParameter extends CfnParameter {
  public readonly id: string;

  constructor(scope: GuStack, id: string, props: GuParameterProps) {
    super(scope, id, {
      ...(props.fromSSM && { default: "Add the SSM path as the default value e.g. /$stage/$stack/$app/$param" }),
      ...props,
      type: props.fromSSM ? `AWS::SSM::Parameter::Value<${props.type ?? "String"}>` : props.type,
    });

    this.id = id;
  }
}

export class GuStringParameter extends GuParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, { ...props, type: "String" });
  }
}

export class GuArnParameter extends GuStringParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      allowedPattern: RegexPattern.ARN,
      constraintDescription: "Must be a valid ARN, eg: arn:partition:service:region:account-id:resource-id",
    });
  }
}
