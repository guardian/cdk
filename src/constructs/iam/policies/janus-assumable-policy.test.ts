import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuAllowPolicy } from "./index";

describe("The GuJanusAssumablePolicy construct", () => {
  it("adds all Janus tags to all policies when all properties are provided", () => {
    const stack = simpleGuStackForTesting();
    new GuAllowPolicy(stack, "GuAllowPolicy", {
      actions: ["S3:*"],
      resources: ["*"],
      managed: {
        janusPermission: "testing-janus-permission",
        janusName: "Testing Janus permission",
        janusDescription: "Some text describing janus permission testing",
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("creates role with mandatory Janus tags when only mandatory properties are provided", () => {
    const stack = simpleGuStackForTesting();
    new GuAllowPolicy(stack, "GuAllowPolicy", {
      actions: ["S3:*"],
      resources: ["*"],
      managed: {
        janusPermission: "testing-janus-permission",
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

});
