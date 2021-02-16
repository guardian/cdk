import type { IStringParameter } from "@aws-cdk/aws-ssm";
import { StringParameter } from "@aws-cdk/aws-ssm";
import type { GuStack } from "./stack";

// TODO: Pass the version in as a parameter once the below TODOs are addressed
export function GuSecret(scope: GuStack, secretName: string): IStringParameter {
  const ssmPrefix = `/${scope.stage}/${scope.stack}/${scope.app}`;
  return StringParameter.fromStringParameterAttributes(scope, `${secretName}-ssm`, {
    parameterName: `${ssmPrefix}/${secretName}`,
    simpleName: true,
    // TODO: Specifying a version seems to make the parameter disappear for some reason. Work out why so we can allow for multiple versions
    // version: version,
  });
}
