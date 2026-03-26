import type { GuStack } from "../constructs/core";
import { groupBy } from "../utils/array";
import type { ClassName, Region, RiffRaffProjectName, StackTag, StageTag } from "./types";
import { UnknownRiffRaffProjectName } from "./types";

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

export function groupByRiffRaffProjectName(cdkStacks: GuStack[]): Record<RiffRaffProjectName, GuStack[]> {
  return groupBy(cdkStacks, (_) => _.riffRaffProjectName ?? UnknownRiffRaffProjectName);
}
