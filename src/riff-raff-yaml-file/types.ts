// type aliases to, hopefully, improve readability
import type { GuStack } from "../constructs/core";

export type RiffRaffProjectName = string;
export type ClassName = string;
export type StackTag = string;
export type StageTag = string;
export type Region = string;
export type CdkStacksDifferingOnlyByStage = GuStack[];

/**
 * The default value used to group {@link GuStack} when generating a `riff-raff.yaml` file.
 * This value will be used when the {@link GuStack} does not have a `riffRaffProjectName` property set.
 * Should only be externally used if adding a custom deployment to the `riff-raff.yaml` file.
 */
export const UnknownRiffRaffProjectName: RiffRaffProjectName = "gu:cdk:constants:unknown-riff-raff-project-name";

export interface RiffRaffYaml {
  allowedStages: Set<StageTag>;
  deployments: Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>;
}

export type RiffRaffDeploymentName = string;

export type RiffRaffDeploymentParameters = Record<string, string | boolean | Record<string, unknown>>;

export interface RiffRaffDeploymentProps {
  type: string;
  regions: Set<Region>;
  stacks: Set<StackTag>;
  app: string;
  contentDirectory: string;
  parameters: RiffRaffDeploymentParameters;
  dependencies?: RiffRaffDeploymentName[];
  actions?: string[];
}

export interface RiffRaffDeployment {
  name: RiffRaffDeploymentName;
  props: RiffRaffDeploymentProps;
}

export type RiffRaffDeployments = Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>;
