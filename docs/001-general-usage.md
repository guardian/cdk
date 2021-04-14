# General Usage for @guardian/cdk

## 🖥 Installation
This library can be installed from [NPM](https://www.npmjs.com/package/@guardian/cdk).

```
npm install --save @guardian/cdk
```

or

```
yarn add @guardian/cdk
```

We recommend using TypeScript with `@guardian/cdk` as type safety is wonderful!

## 🏟 Patterns
Patterns are high level classes which compose a number of constructs to produce standard architectures.

For example, you should be able to get all the resources you need to deploy a new lambda function from one `GuLambdaStack` class.

Patterns should be your default entry point to this library and can be found [here](../src/patterns).

## 🏗 Constructs
Constructs are lower level classes which will create one or more resources to produce one element of a stack.

For example, the `GuDatabaseInstance` will create an RDS instance as well as a parameter group, if required.
This library defines a number of constructs which are combined to create the higher level patterns.

If there is a pattern available for your use case, prefer to use that over composing constructs yourself.
We welcome feedback and/or PRs to extend the functionality of patterns.

Where you need to do something outside currently available patterns, you can use the constructs to provide some level of abstraction.
In this case, consider whether it's worth defining a pattern.

## Using patterns and constructs
Patterns can be imported from the top level of the library:

```typescript
import { GuScheduledLambda } from "@guardian/cdk";
```

While constructs must be imported from their construct directory:

```typescript
import { GuAutoScalingGroup } from "@guardian/cdk/lib/constructs/autoscaling";
```

## ☁️ AWS Library Versions
Any versions of the `@aws-cdk` libraries that you have installed in your project must be the same version as those used in the `@guardian/cdk` library.

## 🪡 Synthesising
The `cdk synth` command can be used to generate cloudformation from CDK definitions.
This will, by default, generate JSON in the `cdk.out` directory.

We recommend using TypeScript with `@guardian/cdk` as type safety is wonderful!

This does, however require the use of `ts-node` to compile on the fly. This can be done in two ways:
  1. Setting the `app` property in the `cdk.json` configuration file
  1. Passing the `app` flag to `cdk`. For example `cdk synth --app="ts-node ./bin/my-app.ts"`

### Synthesising as YAML
For apps with a single stack, the generated YAML will also be printed in the console.
You can pipe this to disk:

```console
cdk synth --app="ts-node ./bin/my-app.ts" > cloudformation.yaml
```

For app with multiple stacks, you can specify a stack to see the YAML output.
