import { Template } from "aws-cdk-lib/assertions";
import { simpleTestingResources } from "../../utils/test";
import { GuCertificate } from "./certificate";

describe("The GuCertificate class", () => {
  it("should create a new certificate when hosted zone ids are provided", () => {
    const { stack, app } = simpleTestingResources();

    new GuCertificate(app, {
      domainName: "code-guardian.com",
      hostedZoneId: "id123",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should create a new certificate (which requires manual DNS changes) if hosted zone ids are not provided", () => {
    const { stack, app } = simpleTestingResources();

    new GuCertificate(app, {
      domainName: "code-guardian.com",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
