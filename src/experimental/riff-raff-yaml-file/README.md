> **Note**
> The `RiffRaffYamlFile` class is currently experimental.
> The API is subject to change.

# `riff-raff.yaml` generator
The `RiffRaffYamlFileExperimental` class can be used to synthesise a `riff-raff.yaml`, so you don't have too!

The aim is to produce a `riff-raff.yaml` file that:
  - Supports provisioning of new services using Riff-Raff, removing the need for manual intervention
  - Supports ongoing deployment

Currently, it supports the following Riff-Raff deployment types:
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
import { GuRootExperimental } from "@guardian/cdk/lib/experimental/constructs/root";

const app = new GuRootExperimental();

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
├── my-other-application
│   └── my-other-application.jar
│   └── my-other-application.service
└── my-lambda
    └── my-lambda.zip
```

That is, all CloudFormation templates are in a `cdk.out` directory, and there is a directory per app.
Application artifact(s) are in the app directory.

Note the file extension is decided by you, the above file tree is used for illustration purposes.
