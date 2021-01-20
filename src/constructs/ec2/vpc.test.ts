import { SynthUtils } from "@aws-cdk/assert";
import type { SynthedStack } from "../../../test/utils";
import { simpleGuStackForTesting } from "../../../test/utils";
import { GuVpc } from "./vpc";

describe("The GuVpc class", () => {
  describe("subnets method", () => {
    test("returns an array of subnets with the correct ids", () => {
      const stack = simpleGuStackForTesting();

      const subnets = GuVpc.subnets(stack, ["subnet1", "subnet2"]);

      expect(subnets[0].subnetId).toBe("subnet1");
      expect(subnets[1].subnetId).toBe("subnet2");
    });
  });

  describe("fromId method", () => {
    test("returns a vpc with the correct id", () => {
      const stack = simpleGuStackForTesting();

      const vpc = GuVpc.fromId(stack, "Vpc", { vpcId: "test" });

      expect(vpc.vpcId).toBe("test");
    });
  });

  describe("fromIdParameter method", () => {
    test("adds the vpc parameter", () => {
      const stack = simpleGuStackForTesting();

      GuVpc.fromIdParameter(stack, "Vpc");

      const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

      expect(json.Parameters.VpcId).toEqual({
        Default: "/account/vpc/primary/id",
        Description: "Virtual Private Cloud to run EC2 instances within",
        Type: "AWS::SSM::Parameter::Value<AWS::EC2::VPC::Id>",
      });
    });
  });
});
