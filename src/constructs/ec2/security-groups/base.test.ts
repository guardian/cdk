import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Peer, Port, Vpc } from "@aws-cdk/aws-ec2";
import { Stack } from "@aws-cdk/core";
import { simpleGuStackForTesting } from "../../../utils/test";
import type { SynthedStack } from "../../../utils/test";
import { GuHttpsEgressSecurityGroup, GuPublicInternetAccessSecurityGroup, GuSecurityGroup } from "./base";

describe("The GuSecurityGroup class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  it("overrides the id if the prop is set to true", () => {
    const stack = simpleGuStackForTesting();

    new GuSecurityGroup(stack, "TestSecurityGroup", { vpc, overrideId: true, app: "testing" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).toContain("TestSecurityGroupTesting");
  });

  it("does not overrides the id if the prop is set to false", () => {
    const stack = simpleGuStackForTesting();

    new GuSecurityGroup(stack, "TestSecurityGroup", { vpc, app: "testing" });

    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(Object.keys(json.Resources)).not.toContain("TestSecurityGroup");
  });

  it("adds the ingresses passed in through props", () => {
    const stack = simpleGuStackForTesting();

    new GuSecurityGroup(stack, "TestSecurityGroup", {
      vpc,
      ingresses: [
        { range: Peer.ipv4("127.0.0.1/24"), description: "ingress1", port: 443 },
        { range: Peer.ipv4("127.0.0.2/8"), description: "ingress2", port: 443 },
      ],
      app: "testing",
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
      app: "testing",
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

  it("should not allow an ingress rule for port 22", () => {
    const stack = simpleGuStackForTesting();

    expect(() => {
      new GuSecurityGroup(stack, "TestSecurityGroup", {
        vpc,
        ingresses: [{ range: Peer.anyIpv4(), description: "SSH access", port: 22 }],
        app: "testing",
      });
    }).toThrow(new Error("An ingress rule on port 22 is not allowed. Prefer to setup SSH via SSM."));
  });
});

describe("The GuPublicInternetAccessSecurityGroup class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  it("adds global access on 443 by default", () => {
    const stack = simpleGuStackForTesting();

    new GuPublicInternetAccessSecurityGroup(stack, "InternetAccessGroup", {
      vpc,
      app: "testing",
    });

    expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
      GroupDescription: "Allow all inbound traffic via HTTPS",
      SecurityGroupIngress: [
        {
          CidrIp: "0.0.0.0/0",
          Description: "Allow all inbound traffic via HTTPS",
          FromPort: 443,
          IpProtocol: "tcp",
          ToPort: 443,
        },
      ],
    });
  });
});

describe("The GuHttpsEgressSecurityGroup class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  it("adds global access on 443 by default", () => {
    const stack = simpleGuStackForTesting();

    GuHttpsEgressSecurityGroup.forVpc(stack, { vpc, app: "testing" });

    expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
      GroupDescription: "Allow all outbound HTTPS traffic",
      SecurityGroupEgress: [
        {
          CidrIp: "0.0.0.0/0",
          Description: "Allow all outbound HTTPS traffic",
          FromPort: 443,
          IpProtocol: "tcp",
          ToPort: 443,
        },
      ],
    });
  });
});
