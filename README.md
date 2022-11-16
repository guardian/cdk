# Guardian CDK Library 

![npm][badge-npm] [![CD][badge-cd]][internal-cd-file]

[badge-cd]: https://github.com/guardian/cdk/actions/workflows/cd.yaml/badge.svg
[badge-npm]: https://img.shields.io/npm/v/@guardian/cdk?style=flat-square
[internal-cd-file]: https://github.com/guardian/cdk/actions/workflows/cd.yaml

The [AWS Cloud Development Kit](https://github.com/aws/aws-cdk) (AWS CDK) is an open-source software
development framework to define cloud infrastructure in code and provision it
through AWS CloudFormation.

`@guardian/cdk` builds on CDK to provide Guardian-specific [patterns](./src/patterns) and
[constructs](./src/constructs). It is an opinionated and secure-by-default way to describe and
provision your AWS resources.

Jump to:

- [Quickstart](#quickstart)
- [CDK demo including screencast](https://github.com/guardian/cdk-demo)
- [Setting up a new project](./docs/setting-up-a-gucdk-project.md)
- [Migrating an existing Cloudformation template](./docs/migration-guide.md)
- View the [typedocs](https://guardian.github.io/cdk/)
- [Contributing](#contributing) to `@guardian/cdk`
- [Best practices](./docs/best-practices.md)

## Quickstart

`@guardian/cdk` expects certain Parameter Store values to be present - for
example, VPC IDs, and the location of dist buckets. To check for account
readiness and fix any issues, run:

    npx @guardian/cdk@latest account-readiness --profile [profile]

Once you've confirmed that your account is ready, you can start provisioning your infrastructure.

> Tip: Setting up a new project? [Start here!](./docs/setting-up-a-gucdk-project.md)

> Tip: Migrating an app? See the [Migration Guide](./docs/migration-guide.md) for more detail.

> Tip: New to CDK? The [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/v2/guide/home.html) is worth a read.

## Contributing

We welcome contributions to `@guardian/cdk`!

To get started, please read our [Contribution Guidelines](./docs/contributing.md).
