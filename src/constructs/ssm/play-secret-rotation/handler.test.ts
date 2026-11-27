import type {
  DescribeParametersCommand,
  DescribeParametersCommandOutput,
  ParameterMetadata,
  PutParameterCommand,
} from "@aws-sdk/client-ssm";
import { rotate } from "./handler";

const now = Date.parse("2026-01-01T12:00:00Z");
const time = new Date(now).toISOString();
const configuration = {
  name: "/CODE/example/play/secret",
  maxEventAgeMs: 60_000,
  transitionMs: 3_600_000,
  tier: "Standard",
  customerManagedKey: false,
  metricNamespace: "Guardian/PlaySecretRotation/test",
  successMetricName: "SuccessfulScheduledRotations",
};
const existing: ParameterMetadata = {
  Name: configuration.name,
  LastModifiedDate: new Date(now - 7_200_000),
  KeyId: "alias/aws/ssm",
  Type: "SecureString",
  Tier: "Standard",
};

function dependencies(metadata = existing) {
  return {
    describe: jest
      .fn<Promise<Pick<DescribeParametersCommandOutput, "Parameters" | "NextToken">>, [DescribeParametersCommand]>()
      .mockResolvedValue({ Parameters: [metadata] }),
    put: jest.fn<Promise<{ Version?: number }>, [PutParameterCommand]>().mockResolvedValue({ Version: 3 }),
  };
}

afterEach(() => jest.restoreAllMocks());

test("finds the exact parameter across pages and writes a new raw secret without logging it", async () => {
  const clients = dependencies();
  clients.describe.mockResolvedValueOnce({ Parameters: [], NextToken: "next" });
  const log = jest.spyOn(process.stdout, "write").mockReturnValue(true);

  await rotate(time, now + 50_000, configuration, clients);

  expect(clients.describe.mock.calls[1]?.[0].input).toEqual({
    ParameterFilters: [{ Key: "Name", Option: "Equals", Values: [configuration.name] }],
    NextToken: "next",
  });
  const request = clients.put.mock.calls[0]?.[0].input;
  expect(request).toMatchObject({
    Name: configuration.name,
    Type: "SecureString",
    KeyId: existing.KeyId,
    Tier: existing.Tier,
    Overwrite: true,
  });
  expect(request?.Value).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(log.mock.calls).toEqual([
    [
      JSON.stringify({
        _aws: {
          Timestamp: now,
          CloudWatchMetrics: [
            {
              Namespace: configuration.metricNamespace,
              Dimensions: [[]],
              Metrics: [{ Name: configuration.successMetricName, Unit: "Count" }],
            },
          ],
        },
        [configuration.successMetricName]: 1,
        version: 3,
      }) + "\n",
    ],
  ]);
});

test("preserves the existing customer key identifier and Advanced tier", async () => {
  const clients = dependencies({ ...existing, KeyId: "alias/play", Tier: "Advanced" });
  jest.spyOn(process.stdout, "write").mockReturnValue(true);

  await rotate(time, now, { ...configuration, customerManagedKey: true, tier: "Advanced" }, clients);

  expect(clients.put.mock.calls[0]?.[0].input).toMatchObject({ KeyId: "alias/play", Tier: "Advanced" });
});

test.each([
  { Name: "/another/parameter" },
  { Type: "String" as const },
  { Tier: "Advanced" as const },
  { KeyId: "alias/unknown" },
  { LastModifiedDate: undefined },
])("does not write if the configured parameter is missing or incompatible (%j)", async (override) => {
  const clients = dependencies({ ...existing, ...override });

  await expect(rotate(time, now, configuration, clients)).rejects.toThrow(/parameter metadata/);
  expect(clients.put).not.toHaveBeenCalled();
});

test("rejects stale deliveries before reading the parameter", async () => {
  const clients = dependencies();

  await expect(rotate(time, now + 60_001, configuration, clients)).rejects.toThrow("Stale");
  expect(clients.describe).not.toHaveBeenCalled();
});

test.each([0, -1_000])("skips duplicate deliveries and writes during the transition (%d ms)", async (offset) => {
  const clients = dependencies({ ...existing, LastModifiedDate: new Date(now + offset) });
  jest.spyOn(console, "info").mockImplementation(() => undefined);

  await rotate(time, now, configuration, clients);

  expect(clients.put).not.toHaveBeenCalled();
});

test("surfaces a write failure without including SDK error details", async () => {
  const clients = dependencies();
  clients.put.mockRejectedValueOnce(new Error("sensitive request details"));

  await expect(rotate(time, now, configuration, clients)).rejects.toThrow(/^Play secret rotation write failed$/);
  expect(clients.put).toHaveBeenCalledTimes(1);
});

test("does not record a successful rotation when the write response is missing its version", async () => {
  const clients = dependencies();
  clients.put.mockResolvedValueOnce({});
  const log = jest.spyOn(process.stdout, "write").mockReturnValue(true);

  await expect(rotate(time, now, configuration, clients)).rejects.toThrow("write returned no version");
  expect(log).not.toHaveBeenCalled();
});
