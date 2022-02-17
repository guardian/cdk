# Guardian CDK Library

![npm][badge-npm] [![CD][badge-cd]][internal-cd-file]

The [AWS Cloud Development Kit](aws-cdk) (AWS CDK) is an open-source software
development framework to define cloud infrastructure in code and provision it
through AWS CloudFormation.

`@guardian/cdk` builds on CDK to provide Guardian-specific patterns and
constructs. It is an opinionated and secure-by-default way to describe and
provision your AWS resources.

- [Introduction to `@guardian/cdk`](./docs/001-general-usage.md)
- [CDK demo including screencast](https://github.com/guardian/cdk-demo)
- [Migrating an existing Cloudformation template](./docs/migration-guide.md)
- [Creating a new EC2 or Lambda application from scratch](./docs/002-starting-a-new-project.md)
- View the [typedocs][internal-website]
- [Contributing](#contributing) to @guardian/cdk

## Quickstart

`@guardian/cdk` expects certain Parameter Store values to be present - for
example, VPC IDs, and the location of dist buckets. To check for account
readiness and fix any issues, run:

    npx @guardian/cdk account-readiness --profile [profile]

Then, instantiate a new CDK app:

    npx @guardian/cdk new --app [app] --stack [stack]

> Tip: if you are migrating an app, see the [Migration
> Guide](./docs/migration-guide.md) for more detail.

> Tip: the [AWS CDK Developer
> Guide](https://docs.aws.amazon.com/cdk/v2/guide/home.html) is worth a
> read-through if you are new to CDK.

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

### Using the `@guardian/cdk` CLI

The CLI supports various commands to ease the transition to CDK.

<!-- cli -->
```
@guardian/cdk COMMAND [args]

Commands:
  @guardian/cdk aws-cdk-version     Print the version of @aws-cdk libraries being
                               used
  @guardian/cdk account-readiness   Perform checks on an AWS account to see if it is
                               GuCDK ready
  @guardian/cdk check-package-json  Check a package.json file for compatibility with
                               GuCDK
  @guardian/cdk new                 Creates a new CDK stack

Options:
      --version  Show version number                                   [boolean]
  -h, --help     Show help                                             [boolean]

```
<!-- clistop -->

## Contributing

We follow the [`script/task`][github-scripts] pattern,
find useful scripts within the [`script`][directory-script] directory for common tasks.

- `./script/setup` to install dependencies
- `./script/start` to run the Jest unit tests in watch mode
- `./script/start-docs` to generate documentation and view in the browser
- `./script/lint` to lint the code using ESLint
- `./script/test` to run the Jest unit tests
- `./script/build` to compile TypeScript to JS
- `./script/cli-docs` to update the CLI documentation in this file

There are also some other commands defined in `package.json`:

- `npm run lint --fix` attempt to autofix any linter errors
- `npm run format` format the code using Prettier
- `npm run watch` watch for changes and compile

However, it's advised you configure your IDE to format on save to avoid horrible "correct linting" commits.

### Decision Records

[Architecture Decisions Records][adr] are files where we can document the decisions we make around any form of structure, architecture or approach.
By documenting them in this way, we can preserve the thought process behind all the decisions whilst also laying out formally the preferences for all developers working on the library.

The [docs/architecture-decision-records directory][directory-adr] contains the records for `@guardian/cdk`.

### Releasing

✨ TL;DR We release new versions of the library to NPM automagically ✨

We use [semantic-release] and [guardian/actions-merge-release-changes-to-protected-branch] to automate releases.

To release a new version:

1. Raise a PR. The PR title must follow the [Angular][angular-commits] / [Karma][karma-commits] format. Don't worry, CI checks this!
1. Once reviewed and approved, merge your PR.
1. Wait for the robots to:
   - Use your structured commit to automatically determine the next version number (following [semantic versioning][sem-ver]).
   - Release a new version to npm and update `package.json`.
1. Enjoy a comment on your PR to inform you that your change has been released.

For more information, see the docs on [testing][docs-testing].

<!-- only links below here -->

[badge-cd]: https://github.com/guardian/cdk/actions/workflows/cd.yaml/badge.svg
[badge-npm]: https://img.shields.io/npm/v/@guardian/cdk?style=flat-square
[directory-adr]: ./docs/architecture-decision-records
[directory-docs]: ./docs
[directory-script]: ./script
[docs-testing]: ./docs/006-testing.md
[internal-cd-file]: https://github.com/guardian/cdk/actions/workflows/cd.yaml
[internal-discussions]: https://github.com/guardian/cdk/discussions
[internal-website]: https://guardian.github.io/cdk/
[adr]: https://github.com/joelparkerhenderson/architecture_decision_recor
[aws-cdk]: https://github.com/aws/aws-cdk
[angular-commits]: https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commits
[github-scripts]: https://github.com/github/scripts-to-rule-them-all
[guardian/actions-merge-release-changes-to-protected-branch]: https://github.com/guardian/actions-merge-release-changes-to-protected-branch
[karma-commits]: http://karma-runner.github.io/6.1/dev/git-commit-msg.html
[semantic-release]: https://github.com/semantic-release/semantic-release
[sem-ver]: https://semver.org/
