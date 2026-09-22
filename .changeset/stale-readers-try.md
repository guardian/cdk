---
"@guardian/cdk": major
---

BREAKING CHANGE: `GuDeveloperPolicyExperimental` has been promoted to stable and renamed `GuDeveloperPolicy`

Example usage:
// Before
import { GuDeveloperPolicyExperimental } from '@guardian/cdk/lib/experimental/constructs/iam/policies';
new GuDeveloperPolicyExperimental(this, 'ExampleDeveloperPolicy', {
grantId: 'ExamplePolicy',
friendlyName: 'An example policy',
statements: [/* ... */],
});

// After
import { GuDeveloperPolicy } from '@guardian/cdk/iam/policies';
new GuDeveloperPolicy(this, 'ExampleDeveloperPolicy', {
  grantId: 'ExamplePolicy',
  friendlyName: 'An example policy',
  statements: [/* ... */],
});
