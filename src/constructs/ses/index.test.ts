import { suite, test } from "node:test";
import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuEmailIdentity } from "./index";

suite("The GuEmailIdentity construct", () => {
  test("should create an EmailIdentity for the specified domain", () => {
    const stack = simpleGuStackForTesting();

    new GuEmailIdentity(stack, "MyEmailIdentity", {
      domainName: "my-service.gutools.co.uk",
      app: "test",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::SES::EmailIdentity", {
      EmailIdentity: "my-service.gutools.co.uk",
    });
  });

  test("only creates this construct for valid domains", (t) => {
    const stack = simpleGuStackForTesting();

    GuEmailIdentity.validDomains.forEach((validDomain, index) => {
      t.assert.doesNotThrow(() => {
        new GuEmailIdentity(stack, `MyEmailIdentity-${validDomain}`, {
          domainName: validDomain,
          app: `test-${index}`,
        });
      });
    });

    t.assert.throws(() => {
      new GuEmailIdentity(stack, "MyEmailIdentity", {
        domainName: "my-service.theguardian.com",
        app: "test",
      });
    }, /Auto verification is only supported for certain domains\. my-service\.theguardian\.com is not supported\./);
  });

  test("should create DKIM CNAME records as required to verify the EmailIdentity", () => {
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
