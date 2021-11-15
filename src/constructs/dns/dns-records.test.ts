import "@aws-cdk/assert/jest";
import "../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Duration } from "@aws-cdk/core";
import { Stage } from "../../constants";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuCname, GuDnsRecordSet, RecordType } from "./dns-records";

describe("The GuDnsRecordSet construct", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    new GuDnsRecordSet(stack, "TestRecord", {
      name: "banana.example.com",
      recordType: RecordType.CNAME,
      resourceRecords: ["apple.example.com"],
      ttl: Duration.hours(1),
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
  it("should use the exact logical id that is passed in", () => {
    const stack = simpleGuStackForTesting();
    new GuDnsRecordSet(stack, "ThisExactLogicalId", {
      name: "banana.example.com",
      recordType: RecordType.CNAME,
      resourceRecords: ["apple.example.com"],
      ttl: Duration.hours(1),
    });
    expect(stack).toHaveResourceOfTypeAndLogicalId("Guardian::DNS::RecordSet", "ThisExactLogicalId");
  });
});

describe("The GuCname construct", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    new GuCname(stack, "TestRecord", {
      domainNameProps: {
        [Stage.CODE]: { domainName: "xyz.code-guardian.com" },
        [Stage.PROD]: { domainName: "xyz.prod-guardian.com" },
      },
      app: "my-test-app",
      resourceRecord: "apple.example.com",
      ttl: Duration.hours(1),
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
