# Guardian CDK Library

![npm][badge-npm] [![CD][badge-cd]][internal-cd-file]

Welcome to the Guardian CDK library! This library contains a number of reusable patterns and constructs which can be used to build up your AWS Cloudformation stacks.

📖 View the available components in the [API documentation][internal-website].

💬 Come and chat to us in [Discussions][internal-discussions]

## Wait, what is CDK?
> The AWS Cloud Development Kit (AWS CDK) is an open-source software development framework to define cloud infrastructure in code and provision it through AWS CloudFormation.

You can read more about it in the [here][aws-cdk].

## Architecture
### Patterns
Patterns are high level classes which compose a number of constructs to produce standard architectures.
For example, you should be able to get all the resources you need to deploy a new lambda function from one `GuLambdaStack` class.

We're still working on these right now but hope to start bringing you some of the most common Guardian stacks soon!

Patterns should be your default entry point to this library.

### Constructs
Constructs are lower level classes which will create one or more resources to produce one element of a stack.
For example, the `GuDatabaseInstance` will create an RDS instance as well as a parameter group, if required.
This library defines a number of constructs which are combined to create the higher level patterns.

If there is a pattern available for your use case, prefer to use that over composing constructs yourself.
We welcome feedback and/or PRs to extend the functionality of patterns.
Where you need to do something outside the currently available patterns, you can use the constructs to provide some level of abstraction.
In this case, consider whether it's worth defining a pattern.

### Decision Records
[Architecture Decisions Records][adr] are files where we can document the decisions we make around any form of structure, architecture or approach.
By documenting them in this way, we can preserve the thought process behind all the decisions whilst also laying out formally the preferences for all developers working on the library.

The [docs/architecture-decision-records directory][directory-adr] contains the records for `@guardian/cdk`.

## Useful commands
We follow the [`script/task`][github-scripts] pattern,
find useful scripts within the [`script`][directory-script] directory for common tasks.

- `./script/setup` to install dependencies
- `./script/start` to run the Jest unit tests in watch mode
- `./script/docs` to generate documentation and view in the browser
- `./script/lint` to lint the code using ESLint
- `./script/test` to run the Jest unit tests
- `./script/build` to compile TypeScript to JS

There are also some other commands defined in `package.json`:

- `npm run lint --fix` attempt to autofix any linter errors
- `npm run format` format the code using Prettier
- `npm run watch` watch for changes and compile

However, it's advised you configure your IDE to format on save to avoid horrible "correct linting" commits.

## Usage
This library can be installed from npm.

```
npm install --save @guardian/cdk
```

or

```
yarn add @guardian/cdk
```

Patterns can be imported from the top level of the library:

```typescript
import { GuScheduledLambda } from "@guardian/cdk";
```

We encourage you to use patterns rather than constructs whenever possible.

If you need to use a construct directly, they must be imported from their construct directory:

```typescript
import { GuAutoScalingGroup } from "@guardian/cdk/lib/constructs/autoscaling";
```

This is intentional as the patterns ideally solve the majority of use-cases.
If they don't, please let us know about your use-case so that we can consider supporting it via a pattern.

Alternatively, PRs are always welcome!

There are more details on using the CDK library in [docs][directory-docs]

## Releasing

✨ TL;DR We release new versions of the library to NPM automagically ✨

We use [semantic-release] and [guardian/actions-merge-release-changes-to-protected-branch] to automate releases.

To release a new version:
1. Raise a PR. The PR title must follow the [Angular][angular-commits] / [Karma][karma-commits] format. Don't worry, CI checks this!
1. Once reviewed and approved, merge your PR.
1. Wait for the robots to:
   - Use your structured commit to automatically determine the next version number (following [semantic versioning][sem-ver]).
   - Release a new version to npm and update `package.json`.
1. Enjoy a comment on your PR to inform you that your change has been released.


<!-- only links below here -->
[badge-cd]: https://github.com/guardian/cdk/actions/workflows/cd.yaml/badge.svg
[badge-npm]: https://img.shields.io/npm/v/@guardian/cdk?style=flat-square

[directory-adr]: ./docs/architecture-decision-records
[directory-docs]: ./docs
[directory-script]: ./script

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
