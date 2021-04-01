import "@aws-cdk/assert/jest";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuSSMIdentityParameter, GuSSMParameter, id } from "./ssm";

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

    it("creates unique IDs using param and stack name for the parameters", function () {
      const stack = simpleGuStackForTesting({ stack: "some-stack" });
      const param1 = new GuSSMParameter(stack, { parameter: "/path/to/some-param" });
      const param2 = new GuSSMParameter(stack, { parameter: "/path/to/some-param" });

      expect(param1.toString()).toMatch(/Test\/GuSSMParameter-pathtosomeparam/i);
      expect(param2.toString()).toMatch(/Test\/GuSSMParameter-pathtosomeparam/i);
      expect(param1.toString()).not.toEqual(param2.toString());
    });

    it("creates unique IDs that handles tokens", function () {
      const stack = simpleGuStackForTesting({ stack: "some-stack" });
      const param1 = new GuSSMParameter(stack, { parameter: `/path/${stack.stage}/some-param` });
      const param2 = new GuSSMParameter(stack, { parameter: `/path/${stack.stage}/some-param` });
      expect(param1.toString()).toMatch(/Test\/GuSSMParameter-token/i);
      expect(param2.toString()).toMatch(/Test\/GuSSMParameter-token/i);
      expect(param1.toString()).not.toEqual(param2.toString());
    });
  });

  describe("the id function", function () {
    it("creates a unique ID given a string", function () {
      expect(id("NameOfConstruct", "some-parameter")).toMatch(/NameOfConstruct-someparameter/i);
    });

    it("will substitute a CDK token for an acceptable string", function () {
      expect(id("NameOfConstruct", "${TOKEN}foobar")).toMatch(/NameOfConstruct-token/i);
    });
  });
});
