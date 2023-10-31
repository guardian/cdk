---
"@guardian/cdk": major
---

Remove support for classic load balancers.

Use of application load balancers (ALBs) is considered best practice,
as ALBs are receiving [more capabilities](https://aws.amazon.com/elasticloadbalancing/features/) than elastic (classic) load balancers (ELBs).
GuCDK should be encoding best practice, so remove support for ELBs.

Please adopt application load balancers instead, or if necessary, use ELBs directly from AWS CDK.
