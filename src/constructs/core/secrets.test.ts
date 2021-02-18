import { SynthUtils } from "@aws-cdk/assert";
import { ServicePrincipal } from "@aws-cdk/aws-iam";
import type { SynthedStack } from "../../../test/utils";
import { simpleGuStackForTesting } from "../../../test/utils";
import { GuRole } from "../iam/roles";
import { GuSecret, GuSecureSecret } from "./secrets";
import type { GuStack } from "./stack";

// TODO: The parameter key is auto-generated, is there a better way of identifying it?
function getSsmParameter(json: SynthedStack) {
  const maybeSsmParm = Object.keys(json.Parameters).filter((p) => p.toLowerCase().includes("ssmparameter"));
  expect(maybeSsmParm.length).toEqual(1);
  return json.Parameters[maybeSsmParm[0]];
}

// Creating a GuSecret with a specified version (that isn't 0) doesn't create a CFN parameter,
// so you have to use the secret somewhere in order to test that it's being referenced properly.
// The below is a simple construct use that makes use of the secret in the description
const exampleConstructUsingSecret = (stack: GuStack, secret: string) =>
  new GuRole(stack, "someconstruct", {
    assumedBy: new ServicePrincipal("sns.amazonaws.com"),
    description: secret,
    overrideId: true,
  });

describe("Secrets:", function () {
  describe("theGuSecret function", function () {
    describe("when no version is specified, creates a Cloudformation parameter that", function () {
      it("interpolates the secret name into a standardised SSM path", function () {
        const stack = simpleGuStackForTesting();
        GuSecret(stack, "some-secret-name");

        const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

        expect(getSsmParameter(json)).toEqual(
          expect.objectContaining({
            Default: {
              "Fn::Join": ["", ["/", { Ref: "Stage" }, "/test-stack/testing/some-secret-name"]],
            },
          })
        );
      });

      it("treats version 0 as latest version", function () {
        const stack = simpleGuStackForTesting();
        GuSecret(stack, "some-secret-name", 0);

        const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

        expect(getSsmParameter(json)).toEqual(
          expect.objectContaining({
            Default: {
              "Fn::Join": ["", ["/", { Ref: "Stage" }, "/test-stack/testing/some-secret-name"]],
            },
          })
        );
      });
    });
    describe("with a version specified, does not create a Cloudformation parameter and", function () {
      it("resolves the SSM path using `resolve:ssm` instead and references it directly in a construct that uses it", function () {
        const stack = simpleGuStackForTesting();
        const secret = GuSecret(stack, "some-secret-name", 3);
        exampleConstructUsingSecret(stack, secret.stringValue);

        const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
        const constructUsingSecret = json.Resources["someconstruct"];

        expect(constructUsingSecret.Properties.Description).toEqual(
          expect.objectContaining({
            "Fn::Join": ["", ["{{resolve:ssm:/", { Ref: "Stage" }, "/test-stack/testing/some-secret-name:3}}"]],
          })
        );
      });
    });
  });

  describe("theGuSecureSecret function", function () {
    it("resolves the SSM path using `resolve:ssm-secure` instead and references it directly in a construct that uses it", function () {
      const stack = simpleGuStackForTesting();
      const secret = GuSecureSecret(stack, "some-secret-name", 3);
      exampleConstructUsingSecret(stack, secret.stringValue);

      const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
      const constructUsingSecret = json.Resources["someconstruct"];

      expect(constructUsingSecret.Properties.Description).toEqual(
        expect.objectContaining({
          "Fn::Join": ["", ["{{resolve:ssm-secure:/", { Ref: "Stage" }, "/test-stack/testing/some-secret-name:3}}"]],
        })
      );
    });
  });
});
