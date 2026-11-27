// @ts-check
/**
 * Runtime handler for the scheduled Play secret rotation Lambda. It writes a new version of the
 * existing SSM SecureString without interrupting Play's transition between signing keys.
 *
 * This file is plain JavaScript so CDK can embed it directly in the Lambda at synthesis time.
 */
const { randomBytes } = require("node:crypto");
const { DescribeParametersCommand, PutParameterCommand, SSMClient } = require("@aws-sdk/client-ssm");

/** @typedef {{ name: string, maxEventAgeMs: number, transitionMs: number, tier: string, customerManagedKey: boolean, metricNamespace: string, successMetricName: string }} Configuration */
/** @typedef {{
 *   describe: (command: DescribeParametersCommand) => Promise<Pick<import("@aws-sdk/client-ssm").DescribeParametersCommandOutput, "Parameters" | "NextToken">>,
 *   put: (command: PutParameterCommand) => Promise<Pick<import("@aws-sdk/client-ssm").PutParameterCommandOutput, "Version">>,
 * }} Clients */

/**
 * @param {string} eventTime
 * @param {number} now
 * @param {Configuration} config
 * @param {Clients} clients
 */
async function rotate(eventTime, now, config, clients) {
  const scheduledAt = Date.parse(eventTime);
  if (!Number.isFinite(scheduledAt) || scheduledAt > now || now - scheduledAt > config.maxEventAgeMs) {
    throw new Error("Stale or invalid Play secret rotation event");
  }

  let metadata;
  let nextToken;
  try {
    do {
      const page = await clients.describe(
        new DescribeParametersCommand({
          ParameterFilters: [{ Key: "Name", Option: "Equals", Values: [config.name] }],
          NextToken: nextToken,
        }),
      );
      metadata = page.Parameters?.find((parameter) => parameter.Name === config.name);
      nextToken = page.NextToken;
    } while (!metadata && nextToken);
  } catch {
    throw new Error("Play secret rotation metadata lookup failed");
  }

  const lastModified = metadata?.LastModifiedDate?.getTime();
  const usesDefaultKey = metadata?.KeyId === "alias/aws/ssm";
  if (
    metadata?.Type !== "SecureString" ||
    (metadata.Tier !== "Standard" && metadata.Tier !== "Advanced") ||
    metadata.Tier !== config.tier ||
    !metadata.KeyId ||
    usesDefaultKey === config.customerManagedKey ||
    lastModified === undefined ||
    !Number.isFinite(lastModified)
  ) {
    throw new Error("Missing or incompatible Play secret parameter metadata");
  }
  if (lastModified >= scheduledAt || now - lastModified <= config.transitionMs) {
    console.info("Play secret rotation skipped: parameter already updated or still transitioning");
    return;
  }

  let result;
  try {
    result = await clients.put(
      new PutParameterCommand({
        Name: config.name,
        Type: "SecureString",
        KeyId: metadata.KeyId,
        Tier: metadata.Tier,
        Value: randomBytes(32).toString("base64url"),
        Overwrite: true,
      }),
    );
  } catch {
    throw new Error("Play secret rotation write failed");
  }
  if (result.Version === undefined) {
    throw new Error("Play secret rotation write returned no version");
  }
  // Write an unprefixed CloudWatch EMF record so the metric belongs to the scheduled run, not the log delivery time.
  process.stdout.write(
    JSON.stringify({
      _aws: {
        Timestamp: scheduledAt,
        CloudWatchMetrics: [
          {
            Namespace: config.metricNamespace,
            Dimensions: [[]],
            Metrics: [{ Name: config.successMetricName, Unit: "Count" }],
          },
        ],
      },
      [config.successMetricName]: 1,
      version: result.Version,
    }) + "\n",
  );
}

const reader = new SSMClient({});
const writer = new SSMClient({ maxAttempts: 1 });

/** @param {{ time: string }} event */
async function handler(event) {
  const {
    PARAMETER_NAME,
    MAX_EVENT_AGE_MS,
    TRANSITION_MS,
    PARAMETER_TIER,
    CUSTOMER_MANAGED_KEY,
    METRIC_NAMESPACE,
    SUCCESS_METRIC_NAME,
  } = process.env;
  const maxEventAgeMs = Number(MAX_EVENT_AGE_MS);
  const transitionMs = Number(TRANSITION_MS);
  if (
    !PARAMETER_NAME ||
    !METRIC_NAMESPACE ||
    !SUCCESS_METRIC_NAME ||
    !Number.isSafeInteger(maxEventAgeMs) ||
    maxEventAgeMs <= 0 ||
    !Number.isSafeInteger(transitionMs) ||
    transitionMs <= 0 ||
    (PARAMETER_TIER !== "Standard" && PARAMETER_TIER !== "Advanced")
  ) {
    throw new Error("Invalid Play secret rotation configuration");
  }
  await rotate(
    event.time,
    Date.now(),
    {
      name: PARAMETER_NAME,
      maxEventAgeMs,
      transitionMs,
      tier: PARAMETER_TIER,
      customerManagedKey: CUSTOMER_MANAGED_KEY === "true",
      metricNamespace: METRIC_NAMESPACE,
      successMetricName: SUCCESS_METRIC_NAME,
    },
    { describe: (command) => reader.send(command), put: (command) => writer.send(command) },
  );
}

module.exports = { handler, rotate };
