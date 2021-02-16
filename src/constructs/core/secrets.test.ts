import { SynthUtils } from "@aws-cdk/assert";
import type { SynthedStack } from "../../../test/utils";
import { simpleGuStackForTesting } from "../../../test/utils";
import { GuSecret } from "./secrets";

// TODO: The parameter key is auto-generated, is there a better way of identifying it?
function getSsmParameter(json: SynthedStack) {
  const maybeSsmParm = Object.keys(json.Parameters).filter((p) => p.toLowerCase().includes("ssmparameter"));
  expect(maybeSsmParm.length).toEqual(1);
  return json.Parameters[maybeSsmParm[0]];
}

describe("theGuSecret function", function () {
  it("should interpolate the secret name into a standardised SSM path", function () {
    const stack = simpleGuStackForTesting();
    GuSecret(stack, "some-secret-name");

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(getSsmParameter(json)).toEqual(
      expect.objectContaining({
        Default: {
          "Fn::Join": ["", ["/", { Ref: "Stage" }, "/", { Ref: "Stack" }, "/testing/some-secret-name"]],
        },
      })
    );
  });
});
