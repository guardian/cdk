import { SynthUtils } from "@aws-cdk/assert";
import "@aws-cdk/assert/jest";
import { Peer, Port, Vpc } from "@aws-cdk/aws-ec2";
import { Stack } from "@aws-cdk/core";
import { simpleGuStackForTesting } from "../../../test/utils/simple-gu-stack";
import type { SynthedStack } from "../../../test/utils/synthed-stack";
import { GuSecurityGroup, GuWazuhAccess } from "./security-groups";

describe("The GuSecurityGroup class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  it("overrides the id if the prop is set to true", () => {
    const stack = simpleGuStackForTesting();

    new GuSecurityGroup(stack, "TestSecurityGroup", { vpc, overrideId: true });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("TestSecurityGroup");
  });

  it("does not overrides the id if the prop is set to false", () => {
    const stack = simpleGuStackForTesting();

    new GuSecurityGroup(stack, "TestSecurityGroup", { vpc });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("TestSecurityGroup");
  });

  it("adds the ingresses passed in through props", () => {
    const stack = simpleGuStackForTesting();

    new GuSecurityGroup(stack, "TestSecurityGroup", {
      vpc,
      ingresses: [
        { range: Peer.ipv4("127.0.0.1/24"), description: "ingress1" },
        { range: Peer.ipv4("127.0.0.2/8"), description: "ingress2" },
      ],
    });

    expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
      SecurityGroupIngress: [
        {
          CidrIp: "127.0.0.1/24",
          Description: "ingress1",
          FromPort: 443,
          IpProtocol: "tcp",
          ToPort: 443,
        },
        {
          CidrIp: "127.0.0.2/8",
          Description: "ingress2",
          FromPort: 443,
          IpProtocol: "tcp",
          ToPort: 443,
        },
      ],
    });
  });

  it("adds the egresses passed in through props", () => {
    const stack = simpleGuStackForTesting();

    new GuSecurityGroup(stack, "TestSecurityGroup", {
      vpc,
      allowAllOutbound: false,
      egresses: [
        { range: Peer.ipv4("127.0.0.1/24"), port: Port.tcp(8000), description: "egress1" },
        { range: Peer.ipv4("127.0.0.2/8"), port: Port.tcp(9000), description: "egress2" },
      ],
    });

    expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
      SecurityGroupEgress: [
        {
          CidrIp: "127.0.0.1/24",
          Description: "egress1",
          FromPort: 8000,
          IpProtocol: "tcp",
          ToPort: 8000,
        },
        {
          CidrIp: "127.0.0.2/8",
          Description: "egress2",
          FromPort: 9000,
          IpProtocol: "tcp",
          ToPort: 9000,
        },
      ],
    });
  });
});

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
          Description: "wazuh event logging",
          FromPort: 1514,
          IpProtocol: "tcp",
          ToPort: 1514,
        },
        {
          CidrIp: "0.0.0.0/0",
          Description: "wazuh agent registration",
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
