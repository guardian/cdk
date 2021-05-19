import { SynthUtils } from "@aws-cdk/assert";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuVpc, SubnetType } from "./vpc";
import type { SynthedStack } from "../../utils/test";

describe("The GuVpc class", () => {
  describe("subnets method", () => {
    test("returns an array of subnets with the correct ids", () => {
      const stack = simpleGuStackForTesting();

      const [subnet1, subnet2, ...rest] = GuVpc.subnets(stack, ["subnet1", "subnet2"]);

      expect(subnet1.subnetId).toBe("subnet1");
      expect(subnet2.subnetId).toBe("subnet2");

      // test that no extra subnets are defined
      expect(rest.length).toBe(0);
    });
  });

  describe("subnetsFromParameter method", () => {
    test("adds the parameter with default type as private", () => {
      const stack = simpleGuStackForTesting();

      GuVpc.subnetsfromParameter(stack);

      const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

      expect(json.Parameters.PrivateSubnets).toEqual({
        Default: "/account/vpc/primary/subnets/private",
        Description: "A list of private subnets",
        Type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
      });
    });

    test("adds a public subnets parameter if the type is public", () => {
      const stack = simpleGuStackForTesting();

      GuVpc.subnetsfromParameter(stack, { type: SubnetType.PUBLIC });

      const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

      expect(json.Parameters.PublicSubnets).toEqual({
        Default: "/account/vpc/primary/subnets/public",
        Description: "A list of public subnets",
        Type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
      });
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
