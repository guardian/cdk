import { strictEqual } from "node:assert";
import { suite, test } from "node:test";
import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuVpc, SubnetType } from "./vpc";

suite("The GuVpc class", () => {
  suite("subnets method", () => {
    test("returns an array of subnets with the correct ids", () => {
      const stack = simpleGuStackForTesting();

      const [subnet1, subnet2, ...rest] = GuVpc.subnets(stack, ["subnet1", "subnet2"]);

      strictEqual(subnet1?.subnetId, "subnet1");
      strictEqual(subnet2?.subnetId, "subnet2");

      // test that no extra subnets are defined
      strictEqual(rest.length, 0);
    });
  });

  suite("subnetsFromParameter method", () => {
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

  suite("fromId method", () => {
    test("returns a vpc with the correct id", () => {
      const stack = simpleGuStackForTesting();

      const vpc = GuVpc.fromId(stack, "Vpc", { vpcId: "test" });

      strictEqual(vpc.vpcId, "test");
    });
  });

  suite("fromIdParameter method", () => {
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
