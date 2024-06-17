import { InstanceProfile, ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import type { CfnInfrastructureConfigurationProps } from "aws-cdk-lib/aws-imagebuilder";
import { CfnInfrastructureConfiguration } from "aws-cdk-lib/aws-imagebuilder";
import { type GuStack } from "../core";

export type GuInfrastructureConfigProps = Partial<CfnInfrastructureConfigurationProps> & {
  profile?: InstanceProfile;
};

export class GuInfrastructureConfig extends CfnInfrastructureConfiguration {
  constructor(scope: GuStack, id: string, props: GuInfrastructureConfigProps) {
    super(scope, id, {
      ...props,
      name: props.name ?? `${scope.stack}-${scope.stage}-${scope.app ?? "unknown"}`,
      instanceProfileName:
        props.profile?.instanceProfileName ??
        GuInfrastructureConfig.defaultInstanceProfile(scope, id).instanceProfileName,
      // Build on our most common instance type by default
      instanceTypes: props.instanceTypes ?? ["t4g.micro"],
      resourceTags: {
        Stack: scope.stack,
        Stage: scope.stage,
        App: scope.app ?? "unknown",
        "gu:repo": scope.repositoryName ?? "unknown",
        ...props.resourceTags,
      },
    });
  }

  static defaultInstanceProfile = (scope: GuStack, id: string) => {
    return new InstanceProfile(scope, `${id}InstanceProfile`, {
      role: new Role(scope, `${id}InstanceProfileRole`, {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName("EC2InstanceProfileForImageBuilder"),
          // TODO: This policy is quite permissive. Can we restrict it a bit?
          ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
        ],
      }),
    });
  };
}
