import type { RiffRaffDeployment, RiffRaffDeploymentParameters, RiffRaffDeployments } from "../types";

export function updateDeploymentParameters(
  allDeployments: RiffRaffDeployments,
  deploymentToUpdate: RiffRaffDeployment,
  additionalParametersToApply: RiffRaffDeploymentParameters,
) {
  const currentDeployment = allDeployments.get(deploymentToUpdate.name);
  if (!currentDeployment) {
    throw new Error(`Unable to find deployment ${deploymentToUpdate.name}`);
  }

  allDeployments.set(deploymentToUpdate.name, {
    ...currentDeployment,
    parameters: {
      ...currentDeployment.parameters,
      ...additionalParametersToApply,
    },
  });
}
