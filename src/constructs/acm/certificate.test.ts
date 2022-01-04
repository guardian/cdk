import { SynthUtils } from "@aws-cdk/assert";
import { Stage, StageForInfrastructure } from "../../constants";
import { simpleGuStackForTesting, simpleInfraStackForTesting } from "../../utils/test";
import type { SynthedStack } from "../../utils/test";
import { GuCertificate } from "./certificate";

describe("The GuCertificate class", () => {
  it("should create a new certificate when hosted zone ids are provided", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
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

  it("should create a new certificate (which requires manual DNS changes) if hosted zone ids are not provided", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      [Stage.CODE]: {
        domainName: "code-guardian.com",
      },
      [Stage.PROD]: {
        domainName: "prod-guardian.com",
      },
    });
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should inherit a CloudFormed certificate correctly", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuCertificate(stack, {
      app: "testing",
      existingLogicalId: { logicalId: "MyCloudFormedCertificate", reason: "testing" },
      [Stage.CODE]: {
        domainName: "code-guardian.com",
        hostedZoneId: "id123",
      },
      [Stage.PROD]: {
        domainName: "prod-guardian.com",
        hostedZoneId: "id124",
      },
    });
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("MyCloudFormedCertificate");
  });

  it("should not create a CloudFormation Mapping when used in a GuStackForInfrastructure", () => {
    const infraStack = simpleInfraStackForTesting();
    new GuCertificate(infraStack, {
      app: "testing",
      [StageForInfrastructure]: {
        domainName: "infra-guardian.com",
      },
    });

    const infraJson = SynthUtils.toCloudFormation(infraStack) as SynthedStack;
    expect(infraJson.Mappings).toBeUndefined();
  });
});
