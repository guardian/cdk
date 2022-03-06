import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Peer, Port, Vpc } from "aws-cdk-lib/aws-ec2";
import { GuTemplate, simpleGuStackForTesting } from "../../../utils/test";
import { GuHttpsEgressSecurityGroup, GuSecurityGroup } from "./base";

describe("The GuSecurityGroup class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  it("applies the Stack, Stage and App tags", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuSecurityGroup(stack, "TestSecurityGroup", {
      vpc,
      existingLogicalId: { logicalId: "TestSG", reason: "testing" },
      app: "testing",
    });

    new GuTemplate(stack).hasGuTaggedResource("AWS::EC2::SecurityGroup", { appIdentity: { app: "testing" } });
  });

  it("overrides the logicalId when existingLogicalId is set in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    new GuSecurityGroup(stack, "TestSecurityGroup", {
      vpc,
      existingLogicalId: { logicalId: "TestSG", reason: "testing" },
      app: "testing",
    });

    new GuTemplate(stack).hasResourceWithLogicalId("AWS::EC2::SecurityGroup", "TestSG");
  });

  test("auto-generates the logicalId by default", () => {
    const stack = simpleGuStackForTesting();
    new GuSecurityGroup(stack, "TestSecurityGroup", { vpc, app: "testing" });

    new GuTemplate(stack).hasResourceWithLogicalId("AWS::EC2::SecurityGroup", /^TestSecurityGroup.+$/);
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

    Template.fromStack(stack).hasResourceProperties("AWS::EC2::SecurityGroup", {
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

    Template.fromStack(stack).hasResourceProperties("AWS::EC2::SecurityGroup", {
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

describe("The GuHttpsEgressSecurityGroup class", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  it("adds global access on 443 by default", () => {
    const stack = simpleGuStackForTesting();

    GuHttpsEgressSecurityGroup.forVpc(stack, { vpc, app: "testing" });

    Template.fromStack(stack).hasResourceProperties("AWS::EC2::SecurityGroup", {
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
