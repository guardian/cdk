import { RegexPattern } from "./regex-pattern";

describe("the regex patterns", () => {
  it("should successfully regex against valid ARNs", () => {
    const regex = new RegExp(RegexPattern.ARN);
    expect(regex.test("fooooo")).toBeFalsy();
    expect(regex.test("arn:aws:rds:us-east-2:123456789012:db:my-mysql-instance-1")).toBeTruthy();
  });

  it("should successfully regex against valid s3 ARNs only", () => {
    const regex = new RegExp(RegexPattern.S3ARN);
    expect(regex.test("fooooo")).toBeFalsy();
    expect(regex.test("arn:aws:rds:us-east-2:123456789012:db:my-mysql-instance-1")).toBeFalsy();
    expect(regex.test("arn:aws:s3:::examplebucket/my-data/sales-export-2019-q4.json")).toBeTruthy();
  });
});
