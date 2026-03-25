import type { GuStack } from "../constructs/core";
import { groupBy } from "../utils/array";
import type { ClassName, Region, StackTag, StageTag } from "./types";

export function groupByClassName(cdkStacks: GuStack[]): Record<ClassName, GuStack[]> {
  return groupBy(cdkStacks, (stack) => stack.constructor.name);
}

export function groupByStackTag(cdkStacks: GuStack[]): Record<StackTag, GuStack[]> {
  return groupBy(cdkStacks, ({ stack }) => stack);
}

export function groupByStageTag(cdkStacks: GuStack[]): Record<StageTag, GuStack[]> {
  return groupBy(cdkStacks, ({ stage }) => stage);
}

export function groupByRegion(cdkStacks: GuStack[]): Record<Region, GuStack[]> {
  return groupBy(cdkStacks, ({ region }) => region);
}
