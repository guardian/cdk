enum Stage {
  CODE = "CODE",
  PROD = "PROD",
}

// for use in the `allowed values` property of a cloudformation parameter
const Stages: string[] = Object.values(Stage);

function mapStages<T, V>(record: Record<Stage, T>, pred: (t: T) => V): Record<Stage, V> {
  const stages: Stage[] = Object.keys(Stage) as Stage[];
  const vs: Array<[Stage, V]> = stages.map((stage) => {
    return [stage, pred(record[stage])];
  });
  return Object.fromEntries(vs) as Record<Stage, V>;
}

export { Stage, Stages, mapStages };
