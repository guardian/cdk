/**
 * Attempt to find build number from environment variables, or fallback to `unknown`.
 *
 * @see https://www.jetbrains.com/help/teamcity/predefined-build-parameters.html#Predefined+Server+Build+Parameters
 * @see https://docs.github.com/en/actions/learn-github-actions/environment-variables#default-environment-variables
 */
export function getBuildNumber(): string {
  const envVars = [
    "BUILD_NUMBER", // TeamCity
    "GITHUB_RUN_NUMBER", // GitHub Actions
  ];

  const fallbackValue = "unknown";

  const [maybeBuildNumber] = envVars.map((key) => process.env[key]).filter(Boolean);

  if (maybeBuildNumber) {
    return maybeBuildNumber;
  } else {
    const attemptedLocations = envVars.join(", ");
    console.info(
      `Unable to locate build number from environment variables (tried ${attemptedLocations}). Falling back to ${fallbackValue}.`
    );
    return fallbackValue;
  }
}
