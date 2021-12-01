import type { Stage, StageForInfrastructure } from "../constants";

export type StageValue<T> = Record<Stage, T>;
export type StageForInfrastructureValue<T> = Record<StageForInfrastructure, T>;

export type StageAwareValue<T> = StageValue<T> | StageForInfrastructureValue<T>;

export const StageAwareValue = {
  isStageValue<T>(value: StageAwareValue<T>): value is StageValue<T> {
    return (value as StageValue<T>).PROD !== undefined;
  },

  isStageForInfrastructureValue<T>(value: StageAwareValue<T>): value is StageForInfrastructureValue<T> {
    return (value as StageForInfrastructureValue<T>).INFRA !== undefined;
  },
};
