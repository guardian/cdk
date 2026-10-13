import type { TestContext } from "node:test";
import { suite, test } from "node:test";
import { Peer } from "aws-cdk-lib/aws-ec2";
import type { SecurityGroupAccessRule } from "../../constructs/ec2";
import { transformToSecurityGroupAccessRule } from "./helpers";

suite("The transformToSecurityGroupAccessRule", () => {
  const expected: SecurityGroupAccessRule[] = [
    {
      range: Peer.ipv4("127.0.0.1/32"),
      description: "One",
      port: 443,
    },
    {
      range: Peer.ipv4("127.0.0.2/32"),
      description: "Two",
      port: 443,
    },
  ];
  test("correctly transforms objects", (t: TestContext) => {
    const ingresses = {
      One: "127.0.0.1/32",
      Two: "127.0.0.2/32",
    };

    t.assert.deepEqual(transformToSecurityGroupAccessRule(Object.entries(ingresses), 443), expected);
  });

  test("correctly transforms enums", (t: TestContext) => {
    enum Ingresses {
      One = "127.0.0.1/32",
      Two = "127.0.0.2/32",
    }

    t.assert.deepEqual(transformToSecurityGroupAccessRule(Object.entries(Ingresses), 443), expected);
  });
});
