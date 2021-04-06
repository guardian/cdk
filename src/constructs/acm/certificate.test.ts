import { SynthUtils } from "@aws-cdk/assert";
import { Stage } from "../../constants";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuCertificate } from "./certificate";

describe("The GuCertificate class", () => {
  it("should create a new certificate from scratch", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, "TestCertificate", {
      [Stage.CODE]: {
        domainName: "code-guardian.com",
        hostedZoneId: "id123",
      },
      [Stage.PROD]: {
        domainName: "prod-guardian.com",
        hostedZoneId: "id124",
      },
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  // TODO fix this once https://github.com/guardian/cdk/pull/364 is merged
  it("should inherit a CloudFormed certificate correctly", () => {
    expect(false).toEqual(true);
  });
});
