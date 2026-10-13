import { suite, test } from "node:test";
import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuCertificate } from "./certificate";

suite("The GuCertificate class", () => {
  test("should create a new certificate when hosted zone ids are provided", (t) => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      domainName: "domain-name-for-your-application.example",
      hostedZoneId: "id123",
    });
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });

  test("should create a new certificate (which requires manual DNS changes) if hosted zone ids are not provided", (t) => {
    const stack = simpleGuStackForTesting();
    new GuCertificate(stack, {
      app: "testing",
      domainName: "domain-name-for-your-application.example",
    });
    t.assert.snapshot(Template.fromStack(stack).toJSON());
  });
});
