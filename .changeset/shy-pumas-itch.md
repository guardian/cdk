---
"@guardian/cdk": patch
---

Adjust validation of `targetGroupWeights` property in `GuLoadBalancedAppExperimental`.

Previously, we asserted the sum total weight was 999. From the [AWS docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-elasticloadbalancingv2-listener-targetgrouptuple.html), each ALB target group weight must be between 0 and 999.
From there, AWS will work out the percentage of traffic to send to each target group.

This creates a simpler interface as, for example, to route 1% of traffic to ECS we can:

```ts
targetGroupWeights: {
  ecs: 1,
  ec2: 99
}
```
