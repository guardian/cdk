// type aliases to, hopefully, improve readability
import type { GuStack } from "../constructs/core";

export type ClassName = string;
export type StackTag = string;
export type StageTag = string;
export type Region = string;
export type CdkStacksDifferingOnlyByStage = GuStack[];

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

/*
 The aim here is to produce an identity of a `GuStack` as a composite of:
   - Class name
   - Stack tag
   - Region
 Finally, group by stage to help form the `templateStagePaths` property for the `cloud-formation` deployment type in `riff-raff.yaml`.
 */
export type GroupedCdkStacks = Record<
  ClassName,
  Record<StackTag, Record<Region, Record<StageTag, CdkStacksDifferingOnlyByStage>>>
>;

export type RiffRaffDeployments = Map<RiffRaffDeploymentName, RiffRaffDeploymentProps>;
