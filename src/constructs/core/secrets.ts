import type { IStringParameter } from "@aws-cdk/aws-ssm";
import { StringParameter } from "@aws-cdk/aws-ssm";
import type { GuStack } from "./stack";

export function GuSecret(scope: GuStack, secretName: string, version?: number): IStringParameter {
  const ssmPrefix = `/${scope.stage}/${scope.stack}/${scope.app}`;
  return StringParameter.fromStringParameterAttributes(scope, `${secretName}-ssm`, {
    parameterName: `${ssmPrefix}/${secretName}`,
    simpleName: true,
    version: version,
  });
}

export function GuSecureSecret(scope: GuStack, secretName: string, version: number): IStringParameter {
  const ssmPrefix = `/${scope.stage}/${scope.stack}/${scope.app}`;
  return StringParameter.fromSecureStringParameterAttributes(scope, `${secretName}-ssm`, {
    parameterName: `${ssmPrefix}/${secretName}`,
    simpleName: true,
    version: version,
  });
}
