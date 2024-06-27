import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuEmailIdentity } from "./index";

describe("The GuEmailIdentity construct", () => {
  it("should create an EmailIdentity for the specified domain", () => {
    const stack = simpleGuStackForTesting();

    new GuEmailIdentity(stack, "MyEmailIdentity", {
      domainName: "my-service.gutools.co.uk",
      app: "test",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::SES::EmailIdentity", {
      EmailIdentity: "my-service.gutools.co.uk",
    });
  });

  it("only creates this construct for valid domains", () => {
    const stack = simpleGuStackForTesting();

    GuEmailIdentity.validDomains.forEach((validDomain, index) => {
      expect(() => {
        new GuEmailIdentity(stack, `MyEmailIdentity-${validDomain}`, {
          domainName: validDomain,
          app: `test-${index}`,
        });
      }).not.toThrowError();
    });

    expect(() => {
      new GuEmailIdentity(stack, "MyEmailIdentity", {
        domainName: "my-service.theguardian.com",
        app: "test",
      });
    }).toThrowError(
      "Auto verification is only supported for certain domains. my-service.theguardian.com is not supported.",
    );
  });

  it("should create DKIM CNAME records as required to verify the EmailIdentity", () => {
    const stack = simpleGuStackForTesting();

    new GuEmailIdentity(stack, "MyEmailIdentity", {
      domainName: "my-service.gutools.co.uk",
      app: "test",
    });

    Template.fromStack(stack).hasResourceProperties("Guardian::DNS::RecordSet", {
      RecordType: "CNAME",
    });
  });
});
