import { suite, test } from "node:test";
import { RegexPattern } from "./regex-pattern";

suite("the regex patterns", () => {
  test("should successfully regex against valid ARNs", (t) => {
    const regex = new RegExp(RegexPattern.ARN);
    t.assert.equal(regex.test("fooooo"), false);
    t.assert.equal(regex.test("arn:aws:rds:us-east-2:123456789012:db:my-mysql-instance-1"), true);
  });

  test("should successfully regex against ACM ARNs", (t) => {
    const regex = new RegExp(RegexPattern.ACM_ARN);
    t.assert.equal(regex.test("arn:aws:acm:eu-west-1:000000000000:certificate/123abc-0000-0000-0000-123abc"), true);
    t.assert.equal(regex.test("arn:aws:acm:eu-west-1:000000000000:tls/123abc-0000-0000-0000-123abc"), false);
  });
});
