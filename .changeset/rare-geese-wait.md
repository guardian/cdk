---
"@guardian/cdk": minor
---

feat(asg) Collect all ASG level metrics

This change should have no cost impact:

> Group metrics are available at one-minute granularity at no additional charge, but you must enable them.
> – https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-metrics.html.

If it does, or if you only want a subset, the escape hatch mechanism can be used:

```ts
declare const asg: AutoScalingGroup;

const cfnAsg = asg.node.defaultChild as CfnAutoScalingGroup;

cfnAsg.metricsCollection = [
  {
    granularity: "1Minute",
    metrics: [
      // A subset of metrics
    ],
  },
];
```
