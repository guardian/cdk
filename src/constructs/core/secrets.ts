import type { IStringParameter } from "@aws-cdk/aws-ssm";
import { StringParameter } from "@aws-cdk/aws-ssm";
import type { GuStack } from "./stack";

interface GuSecretProps {
  version?: number;
  path?: string; // In practice, some stacks will want to share usage of an account-wide SSM parameter (such as a vpc ID)
}

export function GuSecret(scope: GuStack, secretName: string, props?: GuSecretProps): IStringParameter {
  const ssmPrefix = `/${scope.stage}/${scope.stack}/${scope.app}`;
  return StringParameter.fromStringParameterAttributes(scope, `${secretName}-ssm`, {
    parameterName: `${props?.path ?? ssmPrefix}/${secretName}`,
    simpleName: !props?.path,
    version: props?.version,
  });
}

export function GuSecureSecret(scope: GuStack, secretName: string, version: number, path?: string): IStringParameter {
  const ssmPrefix = `/${scope.stage}/${scope.stack}/${scope.app}`;
  return StringParameter.fromSecureStringParameterAttributes(scope, `${secretName}-ssm`, {
    parameterName: `${path ?? ssmPrefix}/${secretName}`,
    simpleName: !path,
    version: version,
  });
}
