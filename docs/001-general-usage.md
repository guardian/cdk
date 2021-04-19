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

```bash
cdk synth --app="ts-node ./bin/my-app.ts" > cloudformation.yaml
```

For app with multiple stacks, you can specify a stack to see the YAML output.

## 🧪 Testing
It is recommended to set up [Jest snapshot testing](https://jestjs.io/docs/snapshot-testing) for your stack and have the test run during CI.

Snapshot tests allow you to very quickly see the changes that will be made to the generated template.
This is especially useful when upgrading the version of `@guardian/cdk`.

## 🆙 Upgrading
The `@guardian/cdk` library follows Semantic Versioning.

If you have snapshot testing set up and running in CI, you should feel comfortable updating to any patch or minor release.
You can use dependabot to automate this.

By default, automatic version upgrade PRs will fail their snapshot tests.
This is because `@guardian/cdk` adds a tracking tag (`gu:cdk:version`) to resources with the version number of the library.

To reduce friction, `@guardian/cdk` ships a mock that can be used with Jest, which results in snapshots having a static value for this tag.

### 🃏 Mocking `gu:cdk:version`
We recommend setting up a global Jest mock for `gu:cdk:version`.
This can be done with a few config changes.

First, create `jest.setup.js` and add the global mock:

```javascript
jest.mock("@guardian/cdk/lib/constants/tracking-tag");
```

Next, edit `jest.config.js` setting the [`setupFilesAfterEnv`](https://jestjs.io/docs/configuration#setupfilesafterenv-array) property:

```javascript
module.exports = {
  setupFilesAfterEnv: ["./jest.setup.js"],
};
```

Finally, update your snapshots. The `gu:cdk:version` tag should now be:

```jsonc
{
  "Key": "gu:cdk:version",
  "PropagateAtLaunch": true,
  "Value": "TEST", // <-- would otherwise be the version number of @guardian/cdk in use
}
```

Note: This only affects tests. The `gu:cdk:version` tag in the final template created from a `cdk synth` will have the correct value.

✨ With `gu:cdk:version` mocked, snapshot tests run during CI and dependabot automatically raising PRs to update `@guardian/cdk`,
once CI passes, you can confidently merge PRs to adopt the AWS best practices encoded in `@guardian/cdk` ✨.
