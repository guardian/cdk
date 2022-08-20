# Setting up a GuCDK project
This guide describes the steps to set up a GuCDK project in your repository, integrating it with CI and CD.

Requirements:
  - A choice of Node package manager. We support `npm` and `yarn`.
    Match this to the repository. A `package-lock.json` file means `npm` is used, a `yarn.lock` file means `yarn` is used.
    If the repository has neither file, and there is no strong convention in your team, we recommend npm.
  - Familiarity with the repository's CI process.
  - Use of a recent version of Node. We recommend the [latest LTS version](https://nodejs.org/en/about/releases/).

## Creating a new project
GuCDK provides a CLI tool to create a new project.
It will place files within a `cdk` directory at the root of the repository.

To initialise a new project run the following within your repository:

```sh
npx @guardian/cdk@latest new --app [app] --stack [stack] --stage [stage] --package-manager [npm|yarn]
```

For example, for the app `riff-raff` we'd do:

```sh
npx @guardian/cdk@latest new \
  --app riff-raff \
  --stack deploy \
  --stage CODE \
  --stage PROD
```

> Tip: Run `npx @guardian/cdk@latest new --help` to find out more about the available flags,
including `--yaml-template-location` to use when migrating a YAML template to GuCDK.

You should now have an empty stack within `cdk/lib` for you to populate with the necessary resources.

## Defining your infrastructure

### Patterns and Constructs

You now have an empty stack within `cdk/lib`, and can start adding patterns and constructs!

Patterns are TypeScript classes that create the requisite AWS resources for a common architecture. For example:

* [A Play Framework application](https://guardian.github.io/cdk/classes/patterns.GuEc2App.html) running on EC2 instances
* [A Lambda function](https://guardian.github.io/cdk/classes/patterns.GuScheduledLambda.html) that runs every *n* minutes
* An API which serves requests using AWS Lambda
  * when [serving all requests via single Lambda Function](https://guardian.github.io/cdk/classes/patterns.GuApiLambda.html)
(e.g. when using [`serverless-express`](https://github.com/vendia/serverless-express))
  * when [routing different requests to different Lambda functions based on the path](https://guardian.github.io/cdk/classes/patterns.GuApiGatewayWithLambdaByPath.html)

> Tip: You can find a full list of the available patterns [here](https://guardian.github.io/cdk/modules/patterns.html).

Patterns can be imported from the top level of the library:

```typescript
import { GuEc2App } from "@guardian/cdk";
```

We encourage you to use patterns rather than constructs whenever possible.

If do you need to use a construct directly, they must be imported from their construct directory:

```typescript
import { GuAutoScalingGroup } from "@guardian/cdk/lib/constructs/autoscaling";
```

Our hope is that patterns solve the majority of your use-cases. If they don't,
please let us know about your use-case so that we can consider supporting it via
a pattern.

Alternatively, [PRs are always welcome](./contributing.md)!

## Configuring CI
We strongly recommend configuring CI and CD of your infrastructure as early as possible.
This ensures you have a short feedback loop.

We recommend performing the following steps in CI:
  - `lint` to ensure a common code format
  - `test` to run the snapshot tests to make sure there are no unexpected changes to the generated CFN (see [here](best-practices.md) for more detail)
  - `synth` to generate your template as JSON to `cdk/cdk.out`

These steps are described in the `package.json` file.

### Example
If your CI is executing a bash script, then we'd add something similar to this (assumes `npm`):

```sh
(
  cd cdk
  npm ci
  npm run lint
  npm test
  npm run synth
)
```

## Configuring CD
There are two steps to configuring CD.

1. Include the generated CloudFormation templates from `cdk/cdk.out` in your Riff-Raff bundle.
2. Update `riff-raff.yaml`, adding a `cloud-formation` deployment type. Please refer to the [Riff-Raff docs](https://riffraff.gutools.co.uk/docs/magenta-lib/types#cloudformation) for this.

With CI and CD setup, your infrastructure changes will be deployed upon merge 🎉.
