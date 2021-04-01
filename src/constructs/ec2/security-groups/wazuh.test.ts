import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Vpc } from "@aws-cdk/aws-ec2";
import { Stack } from "@aws-cdk/core";
import type { SynthedStack } from "../../../utils/test";
import { simpleGuStackForTesting } from "../../../utils/test";
import { GuWazuhAccess } from "./wazuh";

describe("The GuWazuhAccess class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  it("sets props as expected", () => {
    const stack = simpleGuStackForTesting();

    new GuWazuhAccess(stack, "WazuhSecurityGroup", { vpc });

    expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
      GroupDescription: "Wazuh agent registration and event logging",
      SecurityGroupEgress: [
        {
          CidrIp: "0.0.0.0/0",
          Description: "Wazuh event logging",
          FromPort: 1514,
          IpProtocol: "tcp",
          ToPort: 1514,
        },
        {
          CidrIp: "0.0.0.0/0",
          Description: "Wazuh agent registration",
          FromPort: 1515,
          IpProtocol: "tcp",
          ToPort: 1515,
        },
      ],
    });
  });

  it("merges default and passed in props", () => {
    const stack = simpleGuStackForTesting();

    new GuWazuhAccess(stack, "WazuhSecurityGroup", { vpc, description: "This is a test" });

    expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
      GroupDescription: "This is a test",
    });
  });

  it("overrides the id if the prop is set to true", () => {
    const stack = simpleGuStackForTesting();

    new GuWazuhAccess(stack, "WazuhSecurityGroup", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("WazuhSecurityGroup");
  });

  it("does not overrides the id if the prop is set to false", () => {
    const stack = simpleGuStackForTesting();

    new GuWazuhAccess(stack, "WazuhSecurityGroup", { vpc, overrideId: false });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("WazuhSecurityGroup");
  });
});
