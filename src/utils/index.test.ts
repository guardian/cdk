import { Peer } from "@aws-cdk/aws-ec2";
import { transformToCidrIngress } from "./index";

describe("The transformToCidrIngress", () => {
  const expected = [
    {
      range: Peer.ipv4("127.0.0.1/32"),
      description: "One",
    },
    {
      range: Peer.ipv4("127.0.0.2/32"),
      description: "Two",
    },
  ];
  test("correctly transforms objects", () => {
    const ingresses = {
      One: "127.0.0.1/32",
      Two: "127.0.0.2/32",
    };

    expect(transformToCidrIngress(Object.entries(ingresses))).toStrictEqual(expected);
  });

  test("correctly transforms enums", () => {
    enum Ingresses {
      One = "127.0.0.1/32",
      Two = "127.0.0.2/32",
    }

    expect(transformToCidrIngress(Object.entries(Ingresses))).toStrictEqual(expected);
  });
});
