# Starting a new CDK project

The [AWS CDK CLI](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html) provides a command to generate a starter project. From there, you can install this library and get started defining your new stack.

The [Guardian CDK CLI](https://github.com/guardian/cdk-cli) also provides some tooling, currently focused on migration but eventually for setting up new stacks too.

This will generate a `cdk` directory where you can start to define your infrastructure.

## Directory structure

This directory will contains directories in which your code is written as well as a number of configuration files. Some of the key directories and files are detailed below.

**bin**

This directory contains a file for each app that your cdk defines. For each app, there may be multiple stacks. For single apps, that file can be called `cdk.ts` whereas for multiple apps it is recommended to name them accordingly.

**lib**

The lib directory contains all of the stack defitions. For single apps, these file(s) will be at the top level of the directory and for a single stack, the file may be called `cdk-stack.ts`. Multiple stacks should be named accordingly and if multiple apps exist, nested in sub directories.

**cdk.out**

This directory is where the synthesised cloudformation will be written to in JSON format.

**cdk.json**

This file contains configuration regarding your CDK.
