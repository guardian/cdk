import { RegexPattern } from "./regex-pattern";

describe("the regex patterns", () => {
  it("should successfully regex against valid ARNs", () => {
    const regex = new RegExp(RegexPattern.ARN);
    expect(regex.test("fooooo")).toBeFalsy();
    expect(regex.test("arn:aws:rds:us-east-2:123456789012:db:my-mysql-instance-1")).toBeTruthy();
  });

  it("should successfully regex against ACM ARNs", () => {
    const regex = new RegExp(RegexPattern.ACM_ARN);
    expect(regex.test("arn:aws:acm:eu-west-1:000000000000:certificate/123abc-0000-0000-0000-123abc")).toBeTruthy();
    expect(regex.test("arn:aws:acm:eu-west-1:000000000000:tls/123abc-0000-0000-0000-123abc")).toBeFalsy();
  });
});
