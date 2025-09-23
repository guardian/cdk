---
"@guardian/cdk": minor
---

Default to `eu-west-1` region.

This change improves determinism by switching the default region from the [`AWS::Region` pseudo parameter](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/pseudo-parameter-reference.html) to `eu-west-1`.
This change will be reflected in your snapshots.

For example, within an IAM Policy, the `Resource` property will change:

```
// Before
"Resource": {
  "Fn::Join": [
    "",
    [
      "arn:aws:ssm:",
      {
        "Ref": "AWS::Region",
      },
      ":",
      {
        "Ref": "AWS::AccountId",
      },
      ":parameter/TEST/test-stack/testing/*",
    ],
  ],
},

// After
"Resource": {
  "Fn::Join": [
    "",
    [
      "arn:aws:ssm:eu-west-1:",
      {
        "Ref": "AWS::AccountId",
      },
      ":parameter/TEST/test-stack/testing/*",
    ],
  ],
},
```

The region continues to be user-configurable.

To use `us-east-1`:

```typescript
class MyStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props)
  }
}

const stackInstance = new MyStack(app, 'MyStack', {
  env: {
    region: 'us-east-1'
  }
});
```

Or, to continue using the `AWS::Region` pseudo parameter:

```typescript
class MyStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props)
  }
}

import { Aws } from "aws-cdk-lib";

const stackInstance = new MyStack(app, 'MyStack', {
  env: {
    region: Aws.REGION
  }
});
```
