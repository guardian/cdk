import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuVpc, SubnetType } from "./vpc";

describe("The GuVpc class", () => {
  describe("subnets method", () => {
    test("returns an array of subnets with the correct ids", () => {
      const stack = simpleGuStackForTesting();

      const [subnet1, subnet2, ...rest] = GuVpc.subnets(stack, ["subnet1", "subnet2"]);

      expect(subnet1?.subnetId).toBe("subnet1");
      expect(subnet2?.subnetId).toBe("subnet2");

      // test that no extra subnets are defined
      expect(rest.length).toBe(0);
    });
  });

  describe("subnetsFromParameter method", () => {
    test("adds the parameter with default type as private", () => {
      const stack = simpleGuStackForTesting();

      GuVpc.subnetsFromParameter(stack);

      Template.fromStack(stack).hasParameter("PrivateSubnets", {
        Default: "/account/vpc/primary/subnets/private",
        Type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
      });
    });

    test("adds a public subnets parameter if the type is public", () => {
      const stack = simpleGuStackForTesting();

      GuVpc.subnetsFromParameter(stack, { type: SubnetType.PUBLIC });

      Template.fromStack(stack).hasParameter("PublicSubnets", {
        Default: "/account/vpc/primary/subnets/public",
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

      Template.fromStack(stack).hasParameter("VpcId", {
        Default: "/account/vpc/primary/id",
        Type: "AWS::SSM::Parameter::Value<AWS::EC2::VPC::Id>",
      });
    });
  });
});
