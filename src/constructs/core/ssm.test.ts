import { SynthUtils } from "@aws-cdk/assert";
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import type { SynthedStack } from "../../../test/utils";
import { simpleGuStackForTesting } from "../../../test/utils";
import { GuRole } from "../iam/roles";
import { GuStringParameter } from "./parameters";
import { GuSSMSecureStringParameter, GuSSMStringParameter } from "./ssm";
import type { GuStack } from "./stack";

// TODO: The parameter key is auto-generated, is there a better way of identifying it?
function getSsmParameter(json: SynthedStack) {
  const maybeSSMparam = Object.keys(json.Parameters).filter((p) => p.toLowerCase().includes("ssmstringparameter"));
  expect(maybeSSMparam.length).toEqual(1);
  return json.Parameters[maybeSSMparam[0]];
}

// Creating a GuSSMSecureStringParameter doesn't create any resources in itself,
// so you have to use the secret somewhere in order to test that it's being referenced properly.
// The below is a simple construct use that makes use of the secret in the description
const exampleConstructUsingSecret = (stack: GuStack, secret: string) =>
  new GuRole(stack, "someconstruct", {
    assumedBy: new ServicePrincipal("sns.amazonaws.com"),
    description: secret,
    overrideId: true,
  });

describe("Secrets:", function () {
  describe("the GuSSMStringParameter function", function () {
    it("creates a Cloudformation parameter and requires a path without tokens", function () {
      const stack = simpleGuStackForTesting();
      GuSSMStringParameter(stack, "/path/to/some-secret-name");

      const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

      expect(getSsmParameter(json)).toEqual(expect.objectContaining({ Default: "/path/to/some-secret-name" }));
    });

    it("throws error if being passed a token", function () {
      const stack = simpleGuStackForTesting();
      const token = new GuStringParameter(stack, "some-token", {});
      expect(() => GuSSMStringParameter(stack, `/path/${token.valueAsString}/some-secret-name`)).toThrowError();
    });

    it("can optionally require a version, which uses `resolve:ssm-secure` instead", function () {
      const stack = simpleGuStackForTesting();
      const secret = GuSSMStringParameter(stack, "/path/to/some-secret-name", 3);
      exampleConstructUsingSecret(stack, secret.stringValue);

      const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
      const constructUsingSecret = json.Resources["someconstruct"];

      expect(constructUsingSecret.Properties.Description).toEqual("{{resolve:ssm:/path/to/some-secret-name:3}}");
    });
  });

  describe("the GuSSMSecureStringParameter function", function () {
    it("resolves the SSM path using `resolve:ssm-secure` and references it directly in a construct that uses it", function () {
      const stack = simpleGuStackForTesting();
      const secret = GuSSMSecureStringParameter(stack, "some-secret-name", { version: 3 });
      exampleConstructUsingSecret(stack, secret.stringValue);

      const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
      const constructUsingSecret = json.Resources["someconstruct"];

      expect(constructUsingSecret.Properties.Description).toEqual(
        expect.objectContaining({
          "Fn::Join": ["", ["{{resolve:ssm-secure:/", { Ref: "Stage" }, "/test-stack/testing/some-secret-name:3}}"]],
        })
      );
    });

    it("optionally accepts a path to use", function () {
      const stack = simpleGuStackForTesting();
      const secret = GuSSMSecureStringParameter(stack, "some-secret-name", { version: 0, path: "/foo/bar" });
      exampleConstructUsingSecret(stack, secret.stringValue);

      const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
      const constructUsingSecret = json.Resources["someconstruct"];

      expect(constructUsingSecret.Properties.Description).toEqual("{{resolve:ssm-secure:/foo/bar/some-secret-name:0}}");
    });
  });
});
