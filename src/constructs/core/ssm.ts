import type { IStringListParameter, IStringParameter } from "@aws-cdk/aws-ssm";
import { StringListParameter, StringParameter } from "@aws-cdk/aws-ssm";
import type { GuStack } from "./stack";

enum SSMParameterType {
  String,
  StringList,
  SecureString,
}

interface GuSSMParameterProps {
  version?: number;
  path?: string; // In practice, some stacks will want to share usage of an account-wide SSM parameter (such as a vpc ID)
  type: SSMParameterType;
}

type GuSSMParameterNoTypeProps = Omit<GuSSMParameterProps, "type">;

function GuSSMParameter(
  scope: GuStack,
  name: string,
  props: GuSSMParameterProps
): IStringParameter | IStringListParameter {
  const ssmPrefix = `/${scope.stage}/${scope.stack}/${scope.app}`;
  const attributes = {
    parameterName: `${props.path ?? ssmPrefix}/${name}`,
    simpleName: !props.path,
    version: props.version ?? 0,
  };

  switch (props.type) {
    case SSMParameterType.String:
      return StringParameter.fromStringParameterAttributes(scope, `${name}-ssm-string`, {
        ...attributes,
        parameterName: name,
      });
    case SSMParameterType.StringList:
      return StringListParameter.fromStringListParameterName(
        scope,
        `${name}-ssm-string-list`,
        attributes.parameterName
      );
    case SSMParameterType.SecureString:
      return StringParameter.fromSecureStringParameterAttributes(scope, `${name}-ssm-secure-string`, attributes);
  }
}

export const GuSSMStringParameter = (scope: GuStack, path: string, version?: number): IStringParameter =>
  <IStringParameter>GuSSMParameter(scope, path, { type: SSMParameterType.String, version, path });

export const GuSSMSecureStringParameter = (
  scope: GuStack,
  name: string,
  props: GuSSMParameterNoTypeProps
): IStringParameter => <IStringParameter>GuSSMParameter(scope, name, { ...props, type: SSMParameterType.SecureString });
