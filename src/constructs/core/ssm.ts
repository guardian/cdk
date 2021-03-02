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
type GuSSMSecureStringParameterProps = Omit<GuSSMParameterNoTypeProps, "version">;

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
  version: number,
  props?: GuSSMSecureStringParameterProps
): IStringParameter => {
  // You cannot currently dynamically reference the latest SSM secure string version, so we throw an error here to avoid issues at deployment
  // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references.html#dynamic-references-ssm-pattern
  if (version <= 0) {
    throw new Error(
      "Version must be above 0.\nPlease read: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references.html#dynamic-references-ssm-pattern"
    );
  }
  return <IStringParameter>GuSSMParameter(scope, name, { ...props, version, type: SSMParameterType.SecureString });
};
