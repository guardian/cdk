---
"@guardian/cdk": minor
---

feat(experimental-ec2-pattern): Echo RiffRaffDeploymentId in user-data

This change adds a new CloudFormation parameter, `RiffRaffDeploymentId`, to be set by Riff-Raff during deployment (see guardian/riff-raff#1469).
This parameter is echoed out in the user-data. This means a redeployment of the same build creates a CloudFormation changeset with a new launch template.
Consequently, the running EC2 instances are cycled. This means scheduled deployments are possible.
