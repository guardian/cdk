enum Stage {
  CODE = "CODE",
  PROD = "PROD",
  INFRA = "INFRA", // Use for cross-stage infrastructure, such as VPCs.
}

// for use in the `allowed values` property of a cloudformation parameter
const Stages: string[] = Object.values(Stage);

export { Stage, Stages };
