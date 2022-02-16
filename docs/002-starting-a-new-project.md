# Starting a new CDK project

We recommend [using the `@guardian/cdk` cli](https://github.com/guardian/cdk/blob/8d5b72871f959d8f85c84c542f09c7069983e818/README.md#using-the-guardiancdk-cli) to generate a `cdk` project with the correct structure and some helpful tooling (e.g. a CI script). Once you have generated this project boilerplate, you can define your infrastructure using [patterns](https://guardian.github.io/cdk/modules/index.html).

## Directory structure for a typical CDK project

This directory will contains directories in which your code is written as well as a number of configuration files. Some of the key directories and files are detailed below.

**bin**

This directory contains a file for each app that your cdk defines. For each app, there may be multiple stacks. For single apps, that file can be called `cdk.ts` whereas for multiple apps it is recommended to name them accordingly.

**lib**

The lib directory contains all of the stack defitions. For single apps, these file(s) will be at the top level of the directory and for a single stack, the file may be called `cdk-stack.ts`. Multiple stacks should be named accordingly and if multiple apps exist, nested in sub directories.

**cdk.out**

This directory is where the synthesised CloudFormation will be written to in JSON format.

**cdk.json**

This file contains configuration regarding your CDK.
