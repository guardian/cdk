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

- `npm run test` perform the jest unit tests
- `npm run lint` lint the code using eslint
- `npm run lint --fix` attempt to autofix any linter errors
- `npm run format` format the code using prettier
- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile

## Usage

This library can currently be installed using git and ssh.

```
npm install --save git+ssh://git@github.com:guardian/cdk.git
```

### NPM

To get the `@guardian/cdk` library to work you must currently install dependencies via `npm`. This is due to [a bug](https://github.com/yarnpkg/yarn/issues/5235#issuecomment-571206092) that causes the contents `lib` directory of the module to be removed after the `prepare` script has run.

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

You can read more about migrating from Cloudformation to CDK in [MIGRATING.md](./MIGRATING.md)

## Testing

For unit testing, the two key strategies are direct assertions and snapshot tests. When testing constructs, prefer using direct asserts while for patterns, make greater use of snapshot testing. For examples of these two approaches see [src/constructs/autoscaling/asg.test.ts](./src/constructs/autoscaling/asg.test.ts) and [src/patterns/instance-role.test.ts](./src/patterns/instance-role.test.ts) respectively.
