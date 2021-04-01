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
      const actual1 = id("NameOfConstruct", "some-parameter");
      const actual2 = id("NameOfConstruct", "some-parameter");

      expect(actual1).toMatch(/NameOfConstruct-someparameter/i);
      expect(actual2).toMatch(/NameOfConstruct-someparameter/i);
      expect(actual1).not.toEqual(actual2);
    });

    it("will substitute a CDK token for an acceptable string", function () {
      const actual1 = id("NameOfConstruct", "${TOKEN}foobar");
      const actual2 = id("NameOfConstruct", "${TOKEN}foobar");

      expect(actual1).toMatch(/NameOfConstruct-token/i);
      expect(actual2).toMatch(/NameOfConstruct-token/i);
      expect(actual1).not.toEqual(actual2);
    });
  });
});
