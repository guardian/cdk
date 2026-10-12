import { deepStrictEqual } from "node:assert";
import { suite, test } from "node:test";
import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Topic } from "aws-cdk-lib/aws-sns";
import { AppIdentity } from "./identity";

suite("AppIdentity.addAppToStringEnd", () => {
  test("should title case the app before suffixing it", () => {
    const actual = AppIdentity.addAppToStringEnd({ app: "myapp" }, "InstanceType");
    const expected = "InstanceTypeMyapp";
    deepStrictEqual(actual, expected);
  });

  test("should work with title case input", () => {
    const actual = AppIdentity.addAppToStringEnd({ app: "MyApp" }, "InstanceType");
    const expected = "InstanceTypeMyApp";
    deepStrictEqual(actual, expected);
  });

  test("should work with uppercase input", () => {
    const actual = AppIdentity.addAppToStringEnd({ app: "MYAPP" }, "InstanceType");
    const expected = "InstanceTypeMYAPP";
    deepStrictEqual(actual, expected);
  });

  test("should handle non-alphanumeric characters (e.g. hyphens)", () => {
    const actual = AppIdentity.addAppToStringEnd({ app: "my-app" }, "InstanceType");
    const expected = "InstanceTypeMyapp";
    deepStrictEqual(actual, expected);
  });
});

suite("AppIdentity.taggedConstruct", () => {
  test("should apply a tag to a resource", () => {
    // not using any Gu constructs to purely test the impact of AppIdentity.taggedConstruct
    const stack = new Stack();

    const snsTopic = new Topic(stack, "myTopic");
    const appIdentity: AppIdentity = { app: "testing" };

    AppIdentity.taggedConstruct(appIdentity, snsTopic);

    Template.fromStack(stack).hasResourceProperties("AWS::SNS::Topic", {
      Tags: [
        {
          Key: "App",
          Value: "testing",
        },
      ],
    });
  });
});
