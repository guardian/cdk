import type { CfnImagePipelineProps, CfnInfrastructureConfiguration } from "aws-cdk-lib/aws-imagebuilder";
import { CfnImagePipeline } from "aws-cdk-lib/aws-imagebuilder";
import type { GuStack } from "../core";
import { GuDistributionConfiguration } from "./distribution";
import { GuInfrastructureConfig } from "./infrastructure";
import type { GuImageRecipe } from "./recipe";

export type GuImagePipelneProps = Omit<
  Partial<CfnImagePipelineProps>,
  "imageRecipeArn" | "infrastructureConfigurationArn" | "distributionConfigurationArn"
> & {
  infrastructureConfig?: CfnInfrastructureConfiguration;
  imageRecipe: GuImageRecipe;
  distributionConfiguration?: GuDistributionConfiguration;
};

export class GuImagePipeline extends CfnImagePipeline {
  constructor(scope: GuStack, id: string, props: GuImagePipelneProps) {
    const name = props.name ?? `${scope.stack}-${scope.stage}-${scope.app ?? "unknown"}`;

    const infrastructureConfig =
      props.infrastructureConfig ?? new GuInfrastructureConfig(scope, `${id}InfrastructureConfig`, {});
    const distributionConfig =
      props.distributionConfiguration ?? new GuDistributionConfiguration(scope, `${id}DistributionConfig`, {});

    super(scope, id, {
      ...props,
      name,
      infrastructureConfigurationArn: infrastructureConfig.attrArn,
      imageRecipeArn: props.imageRecipe.attrArn,
      distributionConfigurationArn: distributionConfig.attrArn,
    });
  }
}
