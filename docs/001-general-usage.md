# General Usage

## Installation

This library can be installed from npm.

```
npm install --save @guardian/cdk
```

or

```
yarn add @guardian/cdk
```

## Patterns

Patterns are high level classes which compose a number of constructs to produce standard architectures. For example, you should be able to get all of the resources you need to deploy a new lambda function from one `GuLambdaStack` class. We're still working on these right now but hope to start bringing you some of the most common Guardian stacks soon!

Patterns should be your default entry point to this library.

## Constructs

Constructs are lower level classes which will create one or more resources to produce one element of a stack. For example, the `GuDatabaseInstance` will create an RDS instance as well as a parameter group, if required. This library defines a number of constructs which are combined to create the higher level patterns.

If there is a pattern available for your use case, prefer to use that over composing constructs yourself. We welcome feedback and/or PRs to extend the functionality of patterns. Where you need to do something outside of currently available patterns, you can use the constructs to provide some level of abstraction. In this case, consider whether it's worth defining a pattern.

## Using patterns and constructs

Patterns can be imported from the top level of the library (e.g. `import { InstanceRole } from "@guardian/cdk";`) while constructs must be imported from their construct directory (e.g. `import { GuAutoScalingGroup } from "@guardian/cdk/lib/constructs/autoscaling";`)

## AWS Library Versions

Any versions of the `@aws-cdk` libraries that you have installed in your project must be the same version as those used in the `@guardian/cdk` library.

## Synthesising

The `cdk synth` command can be used to generate cloudformation from CDK defintions. This will, by default, generate JSON in the `cdk.out` directory. Apps written in typescript will need to either be built first so the javascript can be passed to the app value, or can be passed in directly using `ts-node` (e.g. `--app="ts-node ./bin/my-app.ts"`). For apps with a single stack, the generated yaml will also be printed in the console. For app with multiple stacks, you can specify a stack to see the yaml output. This yaml can then be directed to a file if desired.
