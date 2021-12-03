import "@aws-cdk/assert/jest";
import "../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { simpleInfraStackForTesting } from "../../utils/test";
import { GuVpc } from "./vpc";

describe("The GuVpc construct", () => {
  it("should match snapshot", () => {
    const stack = simpleInfraStackForTesting();
    new GuVpc(stack, "MyVpc");
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should create VPC SSM parameters by default", () => {
    const stack = simpleInfraStackForTesting();
    new GuVpc(stack, "MyVpc", { ssmParameters: true });
    expect(stack).toHaveResourceLike("AWS::SSM::Parameter", {
      Name: "/account/vpc/primary/id",
    });

    expect(stack).toHaveResourceLike("AWS::SSM::Parameter", {
      Name: "/account/vpc/primary/subnets/public",
    });

    expect(stack).toHaveResourceLike("AWS::SSM::Parameter", {
      Name: "/account/vpc/primary/subnets/private",
    });
  });

  it("should not create VPC SSM parameters if set to false", () => {
    const stack = simpleInfraStackForTesting();
    new GuVpc(stack, "MyVpc", { ssmParameters: false });

    expect(stack).toCountResources("AWS::SSM::Parameter", 0);
  });
});
