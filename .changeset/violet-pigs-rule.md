---
"@guardian/cdk": major
---

Removes the `roleConfiguration` property when instantiating a `GuEc2App` or `GuLoadBalancedAppExperimental` in favour of declaring `additionalPolicies` as a top level property.
As a consequence, it is no longer possible to opt-out of log shipping with `withoutLogShipping`; the IAM Policy will always grant PutRecord to the account's logging Kinesis stream.

To migrate, remove the `roleConfiguration` property and move any policies declared in `roleConfiguration.additionalPolicies` to the top level `additionalPolicies` property:

```ts
// Before
new GuEc2App(this, {
  // other props
  roleConfiguration: {
    additionalPolicies: [
      new GuAllowPolicy(this, 'AllowPolicyCloudwatchLogs', {
        actions: ['cloudwatch:*', 'logs:*'],
        resources: ['*'],
      }),
      new GuAllowPolicy(
        this,
        'AllowPolicyDescribeDecryptKms',
        {
          actions: ['kms:Decrypt', 'kms:DescribeKey'],
          resources: [
            `arn:aws:kms:${region}:${account}:FrontendConfigKey`,
          ],
        },
      ),
    ],
  },
});

// After
new GuEc2App(this, {
  // other props
  additionalPolicies: [
    new GuAllowPolicy(this, 'AllowPolicyCloudwatchLogs', {
      actions: ['cloudwatch:*', 'logs:*'],
      resources: ['*'],
    }),
    new GuAllowPolicy(
      this,
      'AllowPolicyDescribeDecryptKms',
      {
        actions: ['kms:Decrypt', 'kms:DescribeKey'],
        resources: [
          `arn:aws:kms:${region}:${account}:FrontendConfigKey`,
        ],
      },
    ),
  ],
});
```

A [GitHub search](https://github.com/search?q=org%3Aguardian+withoutLogShipping+NOT+repo%3Aguardian%2Fcdk++NOT+is%3Aarchived+NOT+repo%3Aguardian%2Faws-account-setup&type=code)
shows the `withoutLogShipping` property is never set by clients when instantiating a `GuEc2App` or `GuLoadBalancedAppExperimental`.
