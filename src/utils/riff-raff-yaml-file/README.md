> **Note**
> The `RiffRaffYamlFile` class is currently in alpha.
> The API is subject to change.

# riff-raff-yaml-file
The `RiffRaffYamlFile` class can be used to synthesise a `riff-raff.yaml` for deployment of an application via Riff-Raff,
so you don't have too!

The aim is to produce a `riff-raff.yaml` file that works, the first time, and forever more.

Currently it supports the following Riff-Raff deployment types:
  - `cloud-formation`
  - `aws-lambda` (for each `GuLambdaFunction` used)
  - `autoscaling` (for each `GuAutoScalingGroup` used)

## Usage
Usage should require minimal changes to a GuCDK project:

Update the file `/<repo-root>/cdk/bin/cdk.ts` from:

```ts
import { App } from "aws-cdk-lib";

const app = new App();

new MyStack(app, "my-stack-CODE", {});
new MyStack(app, "my-stack-PROD", {});
```

To:

```ts
import { GuRoot } from "@guardian/cdk/lib/constructs/root";

const app = new GuRoot();

new MyStack(app, "my-stack-CODE", {});
new MyStack(app, "my-stack-PROD", {});
```

When the CDK stack is synthesized, a `riff-raff.yaml` file will be created in the output directory, typically `/<repo-root>/cdk/cdk.out`.

## Package layout
`RiffRaffYamlFile` assumes CI has uploaded files in the following structure:

```
.
├── cdk.out
│   └── MyApplication.template.json
├── my-application
│   └── my-application.deb
└── my-lambda
    └── my-lambda.zip
```

That is, all CloudFormation templates sit in `cdk.out`, and application artifacts sit in `<app>/<filename>.deb`.

Where:
  - `app` matches the [`AppIdentity`](../../constructs/core/identity.ts) of each `GuLambdaFunction` or `GuAutoScalingGroup`
  - `filename` matches the `filename` of each `GuLambdaFunction` or `app` of each `GuAutoScalingGroup`

    Note the file extension is decided by you, `.deb` is used for illustration purposes.
