import type { CfnDistributionConfigurationProps } from "aws-cdk-lib/aws-imagebuilder";
import { CfnDistributionConfiguration } from "aws-cdk-lib/aws-imagebuilder";
import type { GuStack } from "../core";

export type GuDistributionConfigurationProps = Omit<CfnDistributionConfigurationProps, "name" | "distributions"> & {
  /**
   * The name of the distribution configuration. If not provided, a name will be generated.
   */
  name?: string;

  /**
   * The distributions to create. If not provided, a single distribution in the current region will be created.
   */
  distributions?: CfnDistributionConfiguration.DistributionProperty[];
};

export class GuDistributionConfiguration extends CfnDistributionConfiguration {
  constructor(scope: GuStack, id: string, props: GuDistributionConfigurationProps) {
    super(scope, id, {
      ...props,
      name: props.name ?? `${scope.stack}-${scope.stage}-${scope.app ?? "unknown"}`,
      distributions: props.distributions ?? [
        {
          region: scope.region,
        },
      ],
    });
  }
}
