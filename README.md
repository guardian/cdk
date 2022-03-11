# Guardian CDK Library

![npm][badge-npm] [![CD][badge-cd]][internal-cd-file]

[badge-cd]: https://github.com/guardian/cdk/actions/workflows/cd.yaml/badge.svg
[badge-npm]: https://img.shields.io/npm/v/@guardian/cdk?style=flat-square
[internal-cd-file]: https://github.com/guardian/cdk/actions/workflows/cd.yaml

The [AWS Cloud Development Kit](aws-cdk) (AWS CDK) is an open-source software
development framework to define cloud infrastructure in code and provision it
through AWS CloudFormation.

`@guardian/cdk` builds on CDK to provide Guardian-specific patterns and
constructs. It is an opinionated and secure-by-default way to describe and
provision your AWS resources.

Jump to:

- [Quickstart](#quickstart)
- [CDK demo including screencast](https://github.com/guardian/cdk-demo)
- [Migrating an existing Cloudformation template](./docs/migration-guide.md)
- View the [typedocs](https://guardian.github.io/cdk/)
- [Contributing](#contributing) to `@guardian/cdk`
- [Best practices](./docs/best-practices.md)

## Quickstart

`@guardian/cdk` expects certain Parameter Store values to be present - for
example, VPC IDs, and the location of dist buckets. To check for account
readiness and fix any issues, run:

    npx @guardian/cdk@latest account-readiness --profile [profile]

Then, instantiate a new CDK app:

    npx @guardian/cdk@latest new --app [app] --stack [stack] --stage [stage]

> Tip: Migrating an app? See the [Migration Guide](./docs/migration-guide.md) for more detail.

> Tip: New to CDK? The [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/home.html) is worth a read.

### Patterns and Constructs

Once you have your new app, you can start adding patterns and constructs.

Patterns can be imported from the top level of the library:

```typescript
import { GuScheduledLambda } from "@guardian/cdk";
```

We encourage you to use patterns rather than constructs whenever possible.

If you need to use a construct directly, they must be imported from their construct directory:

```typescript
import { GuAutoScalingGroup } from "@guardian/cdk/lib/constructs/autoscaling";
```

Our hope is that patterns solve the majority of your use-cases. If they don't,
please let us know about your use-case so that we can consider supporting it via
a pattern.

Alternatively, PRs are always welcome!

## Contributing

We welcome contributions to `@guardian/cdk`!

To get started, please read our [Contribution Guidelines](./docs/contributing.md).
