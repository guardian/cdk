import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Duration } from "@aws-cdk/core";
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
});

describe("The GuCname construct", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    new GuCname(stack, "TestRecord", {
      name: "banana.example.com",
      resourceRecord: "apple.example.com",
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
  it("should allow users to override the default TTL", () => {
    const stack = simpleGuStackForTesting();
    new GuDnsRecordSet(stack, "TestRecord", {
      name: "banana.example.com",
      recordType: RecordType.CNAME,
      resourceRecords: ["apple.example.com"],
      ttl: Duration.minutes(1),
    });
    expect(stack).toHaveResourceLike("Guardian::DNS::RecordSet", {
      TTL: 60,
    });
  });
});
