import { Peer } from "@aws-cdk/aws-ec2";
import { transformToSecurityGroupAccessRule } from "./helpers";

describe("The transformToSecurityGroupAccessRule", () => {
  const expected = [
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
  test("correctly transforms objects", () => {
    const ingresses = {
      One: "127.0.0.1/32",
      Two: "127.0.0.2/32",
    };

    expect(transformToSecurityGroupAccessRule(Object.entries(ingresses), 443)).toStrictEqual(expected);
  });

  test("correctly transforms enums", () => {
    enum Ingresses {
      One = "127.0.0.1/32",
      Two = "127.0.0.2/32",
    }

    expect(transformToSecurityGroupAccessRule(Object.entries(Ingresses), 443)).toStrictEqual(expected);
  });
});
