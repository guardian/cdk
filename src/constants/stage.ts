enum Stage {
  CODE = "CODE",
  PROD = "PROD",
}

// for use in the `allowed values` property of a cloudformation parameter
const Stages: string[] = Object.values(Stage);

export { Stage, Stages };
