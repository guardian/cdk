export enum Stage {
  CODE = "CODE",
  PROD = "PROD",
}

// for use in the `allowed values` property of a cloudformation parameter
export const Stages: string[] = Object.values(Stage);

export const StageForInfrastructure = "INFRA";
export type StageForInfrastructure = "INFRA";
