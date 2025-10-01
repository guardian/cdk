# Migration Guide

This guide describes how to migrate an existing Cloudformation stack (and template) to `@guardian/cdk`.

If you are starting from scratch, see the [new project guide](setting-up-a-gucdk-project.md).

---

## Overall migration process

1. Identify the [GuCDK pattern](https://guardian.github.io/cdk/modules/patterns.html) which works for your app
1. Check account readiness
1. Add GuCDK to your repository and CI/CD process
1. Instantiate a GuCDK pattern alongside your legacy infrastructure (dual-stack), for stateless resources
1. Switch your production workload (e.g. serving HTTP traffic or processing data) to the GuCDK infrastructure
1. Remove legacy infrastructure for stateless resources
1. Where necessary, define stateful resources (e.g. DBs) via cdk components instead of via the original template

## Identify the right GuCDK pattern

| YAML Infrastructure                                                                                                                        | Application type                    | GuCDK pattern to use            |
|--------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------|---------------------------------|
| `AWS::AutoScaling::AutoScalingGroup` with either `AWS::ElasticLoadBalancing::LoadBalancer` or `AWS::ElasticLoadBalancingV2::LoadBalancer`  | Serving HTTP traffic                | `GuEc2App`                      |
| `AWS::AutoScaling::AutoScalingGroup` with either `AWS::ElasticLoadBalancing::LoadBalancer` or `AWS::ElasticLoadBalancingV2::LoadBalancer`  | Polling/running tasks on a schedule | `GuPlayWorkerApp`               |
| `AWS::Lambda::Function` (single) with `AWS::ApiGateway::RestApi`                                                                           | Serving HTTP traffic                | `GuApiLambda`                   |
| `AWS::Lambda::Function` (multiple) with `AWS::ApiGateway::RestApi`                                                                         | Serving HTTP traffic                | `GuApiGatewayWithLambdaByPath`  |
| `AWS::Lambda::Function` with `AWS::Events::Rule`                                                                                           | Polling/running tasks on a schedule | `GuScheduledLambda`             |

## Check account readiness

`@guardian/cdk` patterns and constructs rely on parameter store values for things like VPC identifiers and dist buckets.

To ensure AWS your account is set up correctly, run:

    npx @guardian/cdk@latest account-readiness --profile [profile]

Then follow the instructions for any errors.

## Add GuCDK to your repository and CI/CD process

1. Create a new project specifying the `--yaml-template-location` flag.

   ```shell
   npx @guardian/cdk@latest new --app [app] --stack [stack] --stage [stage] --package-manager [npm|yarn] --yaml-template-location
   ```

   For example for the app trigr we do
   ```shell
   npx @guardian/cdk@latest new --app trigr --stack ophan --stage PROD  --package-manager npm --yaml-template-location cloudformation/trigr.cfn.yaml
   ```

   See the [new project](setting-up-a-gucdk-project.md) guide for further reading

2. Check to see what changes will be made to the stack:

   ```shell
   npm run diff -- --profile <AWS PROFILE NAME> <STACK ID FROM bin/cdk.ts>
   ```

   Or you could check against local:

   ```shell
   npm run diff -- --template cloudformation/<app>.cfn.yaml <STACK ID FROM bin/cdk.ts>
   ```

   Again taking `trigr` as an example we could do:
   ```shell
   npm run diff -- --template cloudformation/trigr.cfn.yaml Trigr-PROD
   ```
   Use `Trig-PROD` as found in `cdk.ts`:

   `(new Trigr(app, "Trigr-PROD", { stack: "ophan", stage: "PROD" });)`


   This should only show differences in how resources are tagged; GuCDK will add various tags to _all_ resources in the stack.
   If you find this initial diff too noisy, you could temporarily exclude these tags by amending your [stack's props](https://guardian.github.io/cdk/interfaces/constructs_core.GuStackProps.html#withoutTags),
   specifically set `withoutTags` to `true`.

4. Configure CI and CD. See [Setting up a GuCDK project](setting-up-a-gucdk-project.md) for more detail.

5. Raise a PR and merge.

We now have something like this:

```
CDK(cfn.yaml) -> cfn.json
```

That is, CDK is merely wrapping an existing template.

The end goal is for CDK to do all the work, and remove the YAML template:

```
CDK -> cfn.json
```

In order to achieve this, you should now follow the specific migration guide for the pattern that you're moving to:

- [for `GuEc2App`](./migration-guide-ec2.md)
- [for `GuApiLambda` or `GuApiGatewayWithLambdaByPath`](./migration-guide-api-with-lambda.md)
- [for `GuScheduledLambda`](./migration-guide-scheduled-lambda.md)

If your pattern is not listed here then please contact the DevX Reliability & Operations team for support.
