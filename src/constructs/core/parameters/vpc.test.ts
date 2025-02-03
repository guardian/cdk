import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuVpcParameter, GuVpcPrivateSubnetsParameter, GuVpcPublicSubnetsParameter } from "./vpc";

describe("GuVpcParameter", () => {
  it("can have its default overridden", () => {
    const stack = simpleGuStackForTesting();

    const parameter = GuVpcParameter.getInstance(stack);
    parameter.default = "/account/vpc/secondary/id";

    Template.fromStack(stack).hasParameter("VpcId", {
      Type: "AWS::SSM::Parameter::Value<AWS::EC2::VPC::Id>",
      Description: "Virtual Private Cloud to run EC2 instances within. Should NOT be the account default VPC.",
      Default: "/account/vpc/secondary/id",
    });
  });
});

describe("GuVpcPrivateSubnetsParameter", () => {
  it("can have its default overridden", () => {
    const stack = simpleGuStackForTesting();

    const parameter = GuVpcPrivateSubnetsParameter.getInstance(stack);
    parameter.default = "/account/vpc/secondary/subnets/private";

    Template.fromStack(stack).hasParameter("VpcPrivateSubnets", {
      Type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
      Description: "A comma-separated list of private subnets",
      Default: "/account/vpc/secondary/subnets/private",
    });
  });
});

describe("GuVpcPublicSubnetsParameter", () => {
  it("can have its default overridden", () => {
    const stack = simpleGuStackForTesting();

    const parameter = GuVpcPublicSubnetsParameter.getInstance(stack);
    parameter.default = "/account/vpc/secondary/subnets/public";

    Template.fromStack(stack).hasParameter("VpcPublicSubnets", {
      Type: "AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>",
      Description: "A comma-separated list of public subnets",
      Default: "/account/vpc/secondary/subnets/public",
    });
  });
});
