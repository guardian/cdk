import { suite, test } from "node:test";
import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuGetS3ObjectsPolicy } from "../policies";
import { GuInstanceRole } from "./instance-role";

suite("The GuInstanceRole construct", () => {
  test("should create the correct resources with minimal config", (t) => {
    const stack = simpleGuStackForTesting();
    new GuInstanceRole(stack, { withoutLogShipping: true, app: "testing" });

    const template = Template.fromStack(stack);

    t.assert.snapshot(template.toJSON());
    template.resourceCountIs("AWS::IAM::Role", 1);
    template.resourceCountIs("AWS::IAM::Policy", 4);
  });

  test("should create an additional logging policy if logging stream is specified", (t) => {
    const stack = simpleGuStackForTesting();
    new GuInstanceRole(stack, { app: "testing" });

    const template = Template.fromStack(stack);

    t.assert.snapshot(template.toJSON());
    template.resourceCountIs("AWS::IAM::Role", 1);
    template.resourceCountIs("AWS::IAM::Policy", 5);
  });

  test("should allow additional policies to be specified", (t) => {
    const stack = simpleGuStackForTesting();

    new GuInstanceRole(stack, {
      app: "testing",
      withoutLogShipping: true,
      additionalPolicies: [new GuGetS3ObjectsPolicy(stack, "GetConfigPolicy", { bucketName: "config" })],
    });

    const template = Template.fromStack(stack);

    t.assert.snapshot(template.toJSON());
    template.resourceCountIs("AWS::IAM::Role", 1);
    template.resourceCountIs("AWS::IAM::Policy", 5);
  });

  test("should be possible to create multiple instance roles in a single stack", (t) => {
    const stack = simpleGuStackForTesting();

    new GuInstanceRole(stack, {
      app: "my-first-app",
    });

    new GuInstanceRole(stack, {
      app: "my-second-app",
    });

    const template = Template.fromStack(stack);

    t.assert.snapshot(template.toJSON());
    template.resourceCountIs("AWS::IAM::Role", 2);
    template.resourceCountIs("AWS::IAM::Policy", 7); // 3 shared policies + 2 policies per role (3 + (2*2))
  });
});
