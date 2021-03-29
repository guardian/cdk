import "@aws-cdk/assert/jest";
import { simpleGuStackForTesting } from "../../../test/utils";
import { GuSSMIdentityParameter, GuSSMParameter } from "./ssm";

describe("SSM:", () => {
  describe("The GuSSMIdentityParameter construct", () => {
    it("requires the scope and parameter name", function () {
      const stack = simpleGuStackForTesting({ stack: "some-stack" });
      const param = new GuSSMIdentityParameter(stack, { parameter: "some-param", app: "foo" });
      expect(stack).toHaveResourceLike("Custom::GuGetSSMParameter", {
        getParamsProps: {
          "Fn::Join": ["", ['{"apiRequest":{"Name":"/', { Ref: "Stage" }, '/some-stack/foo/some-param"}}']],
        },
      });
      expect(param.getValue()).toMatch(/TOKEN/i);
    });
  });

  describe("The GuSSMParameter construct", () => {
    it("requires the scope and parameter name", function () {
      const stack = simpleGuStackForTesting({ stack: "some-stack" });
      const param = new GuSSMParameter(stack, { parameter: "/path/to/some-param" });
      expect(stack).toHaveResourceLike("Custom::GuGetSSMParameter", {
        getParamsProps: '{"apiRequest":{"Name":"/path/to/some-param"}}',
      });
      expect(param.getValue()).toMatch(/TOKEN/i);
    });
  });
});
