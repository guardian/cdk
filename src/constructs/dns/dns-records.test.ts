import { suite, test } from "node:test";
import { Duration } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuCname, GuDnsRecordSet, RecordType } from "./dns-records";

suite("The GuDnsRecordSet construct", () => {
  test("should create the correct resources with minimal config", (t) => {
    const stack = simpleGuStackForTesting();
    new GuDnsRecordSet(stack, "TestRecord", {
      name: "banana.example.com",
      recordType: RecordType.CNAME,
      resourceRecords: ["apple.example.com"],
      ttl: Duration.hours(1),
    });
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });
  test("should use the exact logical id that is passed in", () => {
    const stack = simpleGuStackForTesting();
    new GuDnsRecordSet(stack, "ThisExactLogicalId", {
      name: "banana.example.com",
      recordType: RecordType.CNAME,
      resourceRecords: ["apple.example.com"],
      ttl: Duration.hours(1),
    });
    GuTemplate.fromStack(stack).hasResourceWithLogicalId("Guardian::DNS::RecordSet", "ThisExactLogicalId");
  });

  test("should throw if a CNAME is created with multiple answers", (t) => {
    const stack = simpleGuStackForTesting();

    t.assert.throws(() => {
      new GuDnsRecordSet(stack, "ThisExactLogicalId", {
        name: "banana.example.com",
        recordType: RecordType.CNAME,
        resourceRecords: ["apple.example.com", "banana.example.com"],
        ttl: Duration.hours(1),
      });
    }, /According to RFC, a CNAME record should not return multiple answers\. Doing so may cause problems during resolution\./);
  });
});

suite("The GuCname construct", () => {
  test("should create the correct resources with minimal config", (t) => {
    const stack = simpleGuStackForTesting();
    new GuCname(stack, "TestRecord", {
      domainName: "xyz.domain-name-for-your-application.example",
      app: "my-test-app",
      resourceRecord: "apple.example.com",
      ttl: Duration.hours(1),
    });
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });
});
