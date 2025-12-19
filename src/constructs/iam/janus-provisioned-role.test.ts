import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuJanusProvisionedRole } from "./janus-provisioned-role";
import { GuGetS3ObjectsPolicy, GuParameterStoreReadPolicy } from "./policies";

describe("The GuJanusProvisionedRole construct", () => {
  it("creates role with all Janus tags when all properties are provided", () => {
    const stack = simpleGuStackForTesting();
    const role = new GuJanusProvisionedRole(stack, "Role", {
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
    const role = new GuJanusProvisionedRole(stack, "Role", {
      janusPermission: "security-hq-dev",
    });
    const policy = new GuGetS3ObjectsPolicy(stack, "ReadS3File", {
      bucketName: "config-bucket",
      paths: ["config"],
    });
    policy.attachToRole(role);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("creates multiple roles in the same stack", () => {
    const stack = simpleGuStackForTesting();
    const role1 = new GuJanusProvisionedRole(stack, "Role1", {
      janusPermission: "security-hq-dev",
    });
    const policy1 = new GuGetS3ObjectsPolicy(stack, "ReadS3File", {
      bucketName: "config-bucket",
      paths: ["config"],
    });
    policy1.attachToRole(role1);
    const role2 = new GuJanusProvisionedRole(stack, "Role2", {
      janusPermission: "security-hq-dev-advanced",
    });
    const policy2 = new GuParameterStoreReadPolicy(stack, {
      app: "test-app",
    });
    policy2.attachToRole(role2);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
