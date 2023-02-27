import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuCertificate } from "./certificate";

describe("The GuCertificate class", () => {
  it("should create a new certificate when hosted zone ids are provided", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      domainName: "domain-name-for-your-application.example",
      hostedZoneId: "id123",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should create a new certificate (which requires manual DNS changes) if hosted zone ids are not provided", () => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      domainName: "domain-name-for-your-application.example",
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
