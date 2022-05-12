import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { GuTemplate, simpleGuStackForTesting } from "../../../utils/test";
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

    Template.fromStack(stack).hasResourceProperties("AWS::EC2::SecurityGroup", {
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

  it("has the logicalId WazuhSecurityGroup", () => {
    const stack = simpleGuStackForTesting();
    GuWazuhAccess.getInstance(stack, vpc);

    GuTemplate.fromStack(stack).hasResourceWithLogicalId("AWS::EC2::SecurityGroup", "WazuhSecurityGroup");
  });
});
