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

TIP: Run `npx @guardian/cdk@latest new --help` to find out more about the available flags,
including `--yaml-template-location` to use when migrating a YAML template to GuCDK.

You should now have an empty stack within `cdk/lib` for you to populate with the necessary resources.

## Configuring CI
We strongly recommend configuring CI and CD of your infrastructure as early as possible.
This ensures you have a short feedback loop.

We recommend performing the following steps in CI:
  - `lint` to ensure a common code format
  - `test` to ensure your snapshot is up-to-date (see [here](best-practices.md) for more detail)
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
