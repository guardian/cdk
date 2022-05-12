import { Template } from "aws-cdk-lib/assertions";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import { GuCertificate } from "./certificate";

describe("The GuCertificate class", () => {
  it("should create a new certificate when hosted zone ids are provided", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      domainName: "code-guardian.com",
      hostedZoneId: "id123",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should create a new certificate (which requires manual DNS changes) if hosted zone ids are not provided", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      domainName: "code-guardian.com",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should inherit a CloudFormed certificate correctly", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      existingLogicalId: { logicalId: "MyCloudFormedCertificate", reason: "testing" },
      domainName: "code-guardian.com",
    });

    GuTemplate.fromStack(stack).hasResourceWithLogicalId(
      "AWS::CertificateManager::Certificate",
      "MyCloudFormedCertificate"
    );
  });
});
