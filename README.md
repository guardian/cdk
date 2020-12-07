# Guardian CDK Library

Welcome to the Guardian CDK library! This library contains a number of reusable patterns and constructs which can be used to build up your AWS Cloudformation stacks.

## Wait, what is CDK?

> The AWS Cloud Development Kit (AWS CDK) is an open-source software development framework to define cloud infrastructure in code and provision it through AWS CloudFormation.

You can read more about it in the [aws-cdk README](https://github.com/aws/aws-cdk).

## Patterns

Patterns are high level classes which compose a number of constructs to produce standard architectures. For example, you should be able to get all of the resources you need to deploy a new lambda function from one `GuLambdaStack` class. We're still working on these right now but hope to start bringing you
some of the most common Guardian stacks soon!

Patterns should be your default entry point to this library.

## Constructs

Constructs are lower level classes which will create one or more resources to produce one element of a stack. For example, the `GuDatabaseInstance` will create an RDS instance as well as a parameter group, if required. This library defines a number of constructs which are combined to create the higher level patterns.

If there is a pattern available for your use case, prefer to use that over composing constructs yourself. We welcome feedback and/or PRs to extend the functionality of patterns. Where you need to do something outside of currently available patterns, you can use the constructs to provide some level of abstraction. In this case, consider whether it's worth defining a pattern.

## Useful commands

- `yarn test` perform the jest unit tests
- `yarn lint` lint the code using eslint
- `yarn lint --fix` attempt to autofix any linter errors
- `yarn format` format the code using prettier
- `yarn build` compile typescript to js
- `yarn watch` watch for changes and compile

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

### AWS Library Versions

Any versions of the `@aws-cdk` libraries that you have installed in your project must be the same version as those used in the `@guardian/cdk` library.

### Profile

You may need to set the profile value in the `cdk.json` file to a value which does not exist (e.g. `does-not-exist`).
This is a workaround to a known
[issue](https://github.com/aws/aws-cdk/issues/7849) where expired credentials
cause an error when running the `cdk synth` command. As we don't (yet) use any
features which require connecting to an account this does not break anything but
in the future we may actually require valid credentials to generate the
cloudformation.

## Starting a new CDK project

The [AWS CDK CLI](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html) provides a command to generate
a starter project. From there, you can install this library and get started defining your new stack.

The [Guardian CDK CLI](https://github.com/guardian/cdk-cli) also provides some tooling, currently focused on migration
but eventually for setting up new stacks too.

## Migration

You can read more about migrating from Cloudformation to CDK in [MIGRATING.md](MIGRATING.md)

## Testing

For unit testing, the two key strategies are direct assertions and snapshot tests. When testing constructs, prefer using direct asserts while for patterns, make greater use of snapshot testing. For examples of these two approaches see [src/constructs/autoscaling/asg.test.ts](src/constructs/autoscaling/asg.test.ts) and [src/patterns/instance-role.test.ts](src/patterns/instance-role.test.ts) respectively.

## Releasing

We use [`np`](https://www.npmjs.com/package/np) to help orchestrate the release process.
To release a new version, run `yarn release`.
