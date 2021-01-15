# Guardian CDK Library

Welcome to the Guardian CDK library! This library contains a number of reusable patterns and constructs which can be used to build up your AWS Cloudformation stacks.

## Wait, what is CDK?

> The AWS Cloud Development Kit (AWS CDK) is an open-source software development framework to define cloud infrastructure in code and provision it through AWS CloudFormation.

You can read more about it in the [aws-cdk README](https://github.com/aws/aws-cdk).

## Architecture

Read more about constructs, patterns and other architectural decisions in [docs](docs)

### Patterns

Patterns are high level classes which compose a number of constructs to produce standard architectures. For example, you should be able to get all of the resources you need to deploy a new lambda function from one `GuLambdaStack` class. We're still working on these right now but hope to start bringing you
some of the most common Guardian stacks soon!

Patterns should be your default entry point to this library.

### Constructs

Constructs are lower level classes which will create one or more resources to produce one element of a stack. For example, the `GuDatabaseInstance` will create an RDS instance as well as a parameter group, if required. This library defines a number of constructs which are combined to create the higher level patterns.

If there is a pattern available for your use case, prefer to use that over composing constructs yourself. We welcome feedback and/or PRs to extend the functionality of patterns. Where you need to do something outside of currently available patterns, you can use the constructs to provide some level of abstraction. In this case, consider whether it's worth defining a pattern.

## Useful commands

We follow the [`script/task`](https://github.com/github/scripts-to-rule-them-all) pattern,
find useful scripts within the [`script`](./script) directory for common tasks.

- `./script/setup` to install dependencies
- `./script/start` to run the Jest unit tests in watch mode
- `./script/docs` to generate documentation and view in the browser
- `./script/lint` to lint the code using ESLint
- `./script/test` to run the Jest unit tests
- `./script/build` to compile TypeScript to JS
- `./script/release` to release a new version to NPM

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

Patterns can be imported from the top level of the library (e.g. `import { InstanceRole } from "@guardian/cdk";`) while constructs must be imported from their construct directory (e.g. `import { GuAutoScalingGroup } from "@guardian/cdk/lib/constructs/autoscaling";`)

There are more details on using the CDK library in [docs](docs)

## Releasing

We use [`np`](https://www.npmjs.com/package/np) to help orchestrate the release process.
To release a new version, run `./script/release`. You will need to be logged in to your `npm` account (`npm login`) which must be part of the Guardian organisation. If you have 2fa enabled, you will be prompted for an OTP during the release process.
