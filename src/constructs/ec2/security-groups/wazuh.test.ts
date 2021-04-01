import "@aws-cdk/assert/jest";
import { Vpc } from "@aws-cdk/aws-ec2";
import { Stack } from "@aws-cdk/core";
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
});
