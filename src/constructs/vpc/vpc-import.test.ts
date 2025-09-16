import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuVpcImport } from "./vpc-import";

describe("The GuVpcImport class", () => {
  describe("fromSsmParameters method", () => {
    it("adds the VpcId, VpcPrivateSubnets, and VpcPublicSubnets parameters to the stack", () => {
      const stack = simpleGuStackForTesting();
      expect(Object.keys(stack.parameters)).toHaveLength(0);

      GuVpcImport.fromSsmParameters(stack);
      expect(Object.keys(stack.parameters)).toHaveLength(3);

      Template.fromStack(stack).hasParameter("VpcId", {
        Type: "AWS::SSM::Parameter::Value<AWS::EC2::VPC::Id>",
        Description: "Virtual Private Cloud to run EC2 instances within. Should NOT be the account default VPC.",
        Default: "/account/vpc/primary/id",
      });

      Template.fromStack(stack).hasParameter("VpcPrivateSubnets", {
        Type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
        Description: "A comma-separated list of private subnets",
        Default: "/account/vpc/primary/subnets/private",
      });

      Template.fromStack(stack).hasParameter("VpcPublicSubnets", {
        Type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
        Description: "A comma-separated list of public subnets",
        Default: "/account/vpc/primary/subnets/public",
      });
    });

    it("returns a VPC with private and public subnets set", () => {
      const stack = simpleGuStackForTesting();

      const { vpc } = GuVpcImport.fromSsmParameters(stack);
      const { privateSubnets, publicSubnets } = vpc;

      // The ImportedVpc class doesn't seem to be exported from the aws-cdk-lib package, so assert the constructor name instead.
      expect(vpc.constructor.name).toBe("ImportedVpc");

      expect(privateSubnets).toHaveLength(1);
      expect(publicSubnets).toHaveLength(1);

      // The ImportedSubnet class doesn't seem to be exported from the aws-cdk-lib package, so assert the constructor name instead.
      [...privateSubnets, ...publicSubnets].forEach((subnet) => expect(subnet.constructor.name).toBe("ImportedSubnet"));
    });
  });

  describe("fromSsmParametersRegional method", () => {
    it("adds the VpcId, VpcPrivateSubnets, and VpcPublicSubnets parameters to the stack", () => {
      const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
      expect(Object.keys(stack.parameters)).toHaveLength(0);

      GuVpcImport.fromSsmParametersRegional(stack);
      expect(Object.keys(stack.parameters)).toHaveLength(3);

      Template.fromStack(stack).hasParameter("VpcId", {
        Type: "AWS::SSM::Parameter::Value<AWS::EC2::VPC::Id>",
        Description: "Virtual Private Cloud to run EC2 instances within. Should NOT be the account default VPC.",
        Default: "/account/vpc/primary/id",
      });

      Template.fromStack(stack).hasParameter("VpcPrivateSubnets", {
        Type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
        Description: "A comma-separated list of private subnets",
        Default: "/account/vpc/primary/subnets/private",
      });

      Template.fromStack(stack).hasParameter("VpcPublicSubnets", {
        Type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
        Description: "A comma-separated list of public subnets",
        Default: "/account/vpc/primary/subnets/public",
      });
    });

    it("returns a VPC with private and public subnets set", () => {
      const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });

      const { vpc } = GuVpcImport.fromSsmParametersRegional(stack);
      const { privateSubnets, publicSubnets } = vpc;

      // The ImportedVpc class doesn't seem to be exported from the aws-cdk-lib package, so assert the constructor name instead.
      expect(vpc.constructor.name).toBe("ImportedVpc");

      expect(privateSubnets).toHaveLength(3);
      expect(publicSubnets).toHaveLength(3);

      [...privateSubnets, ...publicSubnets].forEach((subnet) => {
        // The ImportedSubnet class doesn't seem to be exported from the aws-cdk-lib package, so assert the constructor name instead.
        expect(subnet.constructor.name).toBe("ImportedSubnet");
        expect(subnet.availabilityZone).toMatch(/^eu-west-1[a-c]$/);
      });
    });
  });
});
