import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuVpc } from "./vpc";

describe("The GuVpc construct", () => {
  it("should match snapshot", () => {
    const stack = simpleGuStackForTesting({ stack: "test-stack" });
    new GuVpc(stack, "MyVpc");
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should create VPC SSM parameters by default", () => {
    const stack = simpleGuStackForTesting({ stack: "test-stack" });
    new GuVpc(stack, "MyVpc", { ssmParameters: true });

    const template = Template.fromStack(stack);

    ["/account/vpc/primary/id", "/account/vpc/primary/subnets/public", "/account/vpc/primary/subnets/private"].forEach(
      (p) => {
        template.hasResourceProperties("AWS::SSM::Parameter", {
          Name: p,
        });
      }
    );
  });

  it("should not create VPC SSM parameters if set to false", () => {
    const stack = simpleGuStackForTesting({ stack: "test-stack" });
    new GuVpc(stack, "MyVpc", { ssmParameters: false });

    Template.fromStack(stack).resourceCountIs("AWS::SSM::Parameter", 0);
  });
});
