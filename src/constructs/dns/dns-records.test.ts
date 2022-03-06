import { Duration } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
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
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
  it("should use the exact logical id that is passed in", () => {
    const stack = simpleGuStackForTesting();
    new GuDnsRecordSet(stack, "ThisExactLogicalId", {
      name: "banana.example.com",
      recordType: RecordType.CNAME,
      resourceRecords: ["apple.example.com"],
      ttl: Duration.hours(1),
    });
    new GuTemplate(stack).hasResourceWithLogicalId("Guardian::DNS::RecordSet", "ThisExactLogicalId");
  });

  it("should throw if a CNAME is created with multiple answers", () => {
    const stack = simpleGuStackForTesting();

    expect(() => {
      new GuDnsRecordSet(stack, "ThisExactLogicalId", {
        name: "banana.example.com",
        recordType: RecordType.CNAME,
        resourceRecords: ["apple.example.com", "banana.example.com"],
        ttl: Duration.hours(1),
      });
    }).toThrowError(
      "According to RFC, a CNAME record should not return multiple answers. Doing so may cause problems during resolution."
    );
  });
});

describe("The GuCname construct", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    new GuCname(stack, "TestRecord", {
      domainName: "xyz.code-guardian.com",
      app: "my-test-app",
      resourceRecord: "apple.example.com",
      ttl: Duration.hours(1),
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
