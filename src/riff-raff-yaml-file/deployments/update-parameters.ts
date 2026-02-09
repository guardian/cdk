import type { RiffRaffDeployment, RiffRaffDeploymentParameters, RiffRaffDeployments } from "../types";

/**
 * Mutate the parameters of a Riff-Raff deployment.
 */
export function updateDeploymentParameters(
  deployments: RiffRaffDeployments,
  deployment: RiffRaffDeployment,
  additionalParameters: RiffRaffDeploymentParameters,
) {
  const currentDeployment = deployments.get(deployment.name);
  if (!currentDeployment) {
    throw new Error(`Unable to find deployment ${deployment.name}`);
  }

  deployments.set(deployment.name, {
    ...currentDeployment,
    parameters: {
      ...currentDeployment.parameters,
      ...additionalParameters,
    },
  });
}
