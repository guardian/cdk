import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuJanusProvisionedRole } from "./janus-provisioned-role";
import { GuGetS3ObjectsPolicy } from "./policies";

describe("The GuJanusProvisionedRole construct", () => {
  it("creates role with all Janus tags when all properties are provided", () => {
    const stack = simpleGuStackForTesting();
    const role = new GuJanusProvisionedRole(stack, {
      id: "ProvisionedRole",
      janusPermission: "security-hq-dev",
      janusName: "Security HQ Developer",
      janusDescription: "Access to resources needed for basic day-to-day work on the Security HQ app.",
    });
    const policy = new GuGetS3ObjectsPolicy(stack, "ReadS3File", {
      bucketName: "config-bucket",
      paths: ["config"],
    });
    policy.attachToRole(role);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("creates role with mandatory Janus tags when only mandatory properties are provided", () => {
    const stack = simpleGuStackForTesting();
    const role = new GuJanusProvisionedRole(stack, {
      id: "ProvisionedRole",
      janusPermission: "security-hq-dev",
    });
    const policy = new GuGetS3ObjectsPolicy(stack, "ReadS3File", {
      bucketName: "config-bucket",
      paths: ["config"],
    });
    policy.attachToRole(role);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
