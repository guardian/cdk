---
"@guardian/cdk": patch
---

fix(experimental-ec2-pattern): Create Policy first

When deploying Prism with the `GuEc2AppExperimental` for the first time, the deployment failed with the cloud-init-output logs stating:

```log
An error occurred (AccessDenied) when calling the DescribeTargetHealth operation: User: arn:aws:sts::000000000000:assumed-role/prism-CODE-InstanceRolePrism/i-0cee86d64de253ca4 is not authorized to perform: elasticloadbalancing:DescribeTargetHealth because no identity-based policy allows the elasticloadbalancing:DescribeTargetHealth action
```

This suggests the instance update was started before the policy was created.

Make the ASG depend on the policy that grants these permissions to resolve, as CloudFormation creates dependencies first.
