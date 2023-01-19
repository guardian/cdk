import type { GuStack } from "../../constructs/core";
import { groupBy } from "../../utils/array";
import type { GroupedCdkStacks, Region, StackTag, StageTag } from "./types";

function groupByStackTag(cdkStacks: GuStack[]): Record<StackTag, GuStack[]> {
  return groupBy(cdkStacks, ({ stack }) => stack);
}

function groupByStageTag(cdkStacks: GuStack[]): Record<StageTag, GuStack[]> {
  return groupBy(cdkStacks, ({ stage }) => stage);
}

function groupByRegion(cdkStacks: GuStack[]): Record<Region, GuStack[]> {
  return groupBy(cdkStacks, ({ region }) => region);
}

export function groupByClassNameStackRegionStage(cdkStacks: GuStack[]): GroupedCdkStacks {
  return Object.entries(groupByStackTag(cdkStacks)).reduce(
    (accStackTag, [stackTag, stacksGroupedByStackTag]) => ({
      ...accStackTag,
      [stackTag]: Object.entries(groupByRegion(stacksGroupedByStackTag)).reduce(
        (accRegion, [region, stacksGroupedByRegion]) => ({
          ...accRegion,
          [region]: groupByStageTag(stacksGroupedByRegion),
        }),
        {}
      ),
    }),
    {}
  );
}
