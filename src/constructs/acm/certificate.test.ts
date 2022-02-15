import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Stage } from "../../constants";
import { simpleGuStackForTesting } from "../../utils/test";
import type { SynthedStack } from "../../utils/test";
import { GuCertificate } from "./certificate";

describe("The GuCertificate class", () => {
  it("should create a new certificate when hosted zone ids are provided", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      domainName: "code-guardian.com",
      hostedZoneId: "id123",
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should create a new certificate (which requires manual DNS changes) if hosted zone ids are not provided", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      domainName: "code-guardian.com",
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should inherit a CloudFormed certificate correctly", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuCertificate(stack, {
      app: "testing",
      existingLogicalId: { logicalId: "MyCloudFormedCertificate", reason: "testing" },
      domainName: "code-guardian.com",
    });
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("MyCloudFormedCertificate");
  });

  test("the domain name can be stage aware", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      domainName: stack.withStageDependentValue({
        app: "testing",
        variableName: "domainName",
        stageValues: {
          [Stage.CODE]: "code-guardian.com",
          [Stage.PROD]: "prod-guardian.com",
        },
      }),
    });

    expect(stack).toHaveResource("AWS::CertificateManager::Certificate", {
      DomainName: {
        "Fn::FindInMap": [
          "testing",
          {
            Ref: "Stage",
          },
          "domainName",
        ],
      },
    });
  });
});
