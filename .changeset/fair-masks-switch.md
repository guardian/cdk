---
"@guardian/cdk": minor
---

Removes `GuWazuhAccess` security group as Wazuh has been deprecated.

This change will remove a resource of logical ID `WazuhSecurityGroup` from stacks that use a `GuAutoScalingGroup`.
The snapshot diff will include the removal of the following resource:

```json
{
  "Resources": {
    "WazuhSecurityGroup": {
      "Properties": {
        "GroupDescription": "Allow outbound traffic from wazuh agent to manager",
        "SecurityGroupEgress": [
          {
            "CidrIp": "0.0.0.0/0",
            "Description": "Wazuh event logging",
            "FromPort": 1514,
            "IpProtocol": "tcp",
            "ToPort": 1514
          },
          {
            "CidrIp": "0.0.0.0/0",
            "Description": "Wazuh agent registration",
            "FromPort": 1515,
            "IpProtocol": "tcp",
            "ToPort": 1515
          }
        ],
        "Type": "AWS::EC2::SecurityGroup"
      }
    }
  }
}
```
