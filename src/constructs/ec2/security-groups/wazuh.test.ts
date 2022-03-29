import "@aws-cdk/assert/jest";
import "../../../utils/test/jest";
import { Stack } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
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

    GuWazuhAccess.getInstance(stack, vpc);

    expect(stack).toHaveResource("AWS::EC2::SecurityGroup", {
      GroupDescription: "Allow outbound traffic from wazuh agent to manager",
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

  it("has the logicalId WazuhSecurityGroup in a new stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: false });
    GuWazuhAccess.getInstance(stack, vpc);

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::EC2::SecurityGroup", "WazuhSecurityGroup");
  });

  it("has the logicalId WazuhSecurityGroup in a migrating stack", () => {
    const stack = simpleGuStackForTesting({ migratedFromCloudFormation: true });
    GuWazuhAccess.getInstance(stack, vpc);

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::EC2::SecurityGroup", "WazuhSecurityGroup");
  });
});
