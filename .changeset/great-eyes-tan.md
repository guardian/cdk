---
"@guardian/cdk": major
---

Access logging for Application Load Balancers (ALBs) is now enabled by default.

[Application Load Balancer (ALB) access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) describe, in detail, each request processed by a load balancer, including request paths and status codes.
They are helpful during incident response and are now enabled by default.

Previously users of the `GuEc2App`, `GuNodeApp`, `GuPlayApp `, `GuPlayWorkerApp` and `GuEc2AppExperimental` patterns could opt-in to this logging via the `accessLogging` property and configure the S3 prefix.

This property is now removed and replaced with a new optional boolean property `withAccessLogging` which defaults to `true`.
- When `true` the ALB will have access logs enabled, configured to write to the account's S3 bucket using a specific prefix for compatibility with the `gucdk_access_logs` database created in Athena via https://github.com/guardian/aws-account-setup.
- When `false` the [`access_logs.s3.enabled` attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-elasticloadbalancingv2-loadbalancer-loadbalancerattribute.html) is now explicitly set to `false`.

A `withAccessLogging` property is also added to the `GuApplicationLoadBalancer` construct, with the same behaviour.

NOTE: This feature requires a region to be set at the `GuStack` level, else the following error will be thrown:

> ValidationError: Region is required to enable ELBv2 access logging

Here's an example of how to set the region:

```typescript
class MyStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);
  }
}

const stackInstance = new MyStack(app, 'MyStack', {
  env: {
    region: 'eu-west-1'
  },
});
```

There are three cost areas to this feature:
- Writing to S3.

  AWS absorbs these costs.

- S3 data storage.

  This cost will vary depending on the volume of traffic received; more traffic, more logs. To somewhat mitigate this, the target S3 bucket has already been configured to retain logs for 14 days.

- Reading from S3 using Athena.

  This cost will vary depending on the volume of logs queried.
