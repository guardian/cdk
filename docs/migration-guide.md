# Migration Guide

This guide describes how to migrate an existing Cloudformation stack (and template) to `@guardian/cdk`.

If you are starting from scratch, see the [new project guide](setting-up-a-gucdk-project.md).

---

## Account readiness

`@guardian/cdk` patterns and constructs rely on parameter store values for things like VPC identifiers and dist buckets.

To ensure AWS your account is set up correctly, run:

    npx @guardian/cdk@latest account-readiness --profile [profile]

Then follow the instructions for any errors.

## Process
Generally speaking, we've found this to be a good process to follow when migrating a stack to GuCDK (assumes use of `npm`):

### Introduce CDK to the repository with CI/CD
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

   or you could check agains local

   ```shell
   npm run diff -- --template cloudformation/<app>.cfn.yaml <STACK ID FROM bin/cdk.ts>
   ```

   Again taking trigr as an example we could do
   ```shell
   npm run diff -- --template cloudformation/trigr.cfn.yaml Trigr-PROD
   ```
   user Trig-PROD as found in cdk.ts (new Trigr(app, "Trigr-PROD", { stack: "ophan", stage: "PROD" });)

   This should only show differences in how resources are tagged; GuCDK will add various tags to _all_ resources in the stack.
   If you find this initial diff too noisy, you could temporarily exclude these tags by amending your [stack's props](https://guardian.github.io/cdk/interfaces/constructs_core.GuStackProps.html#withoutTags),
   specifically set `withoutTags` to `true`.

4. Configure CI and CD. See [Setting up a GuCDK project](setting-up-a-gucdk-project.md) for more detail.

5. Raise a PR and merge.

### Migration to CDK
We now have something like this:

```
CDK(cfn.yaml) -> cfn.json
```

That is, CDK is merely wrapping an existing template.

The end goal is for CDK to do all the work, and remove the YAML template:

```
CDK -> cfn.json
```

In the previous phase, we also created a [snapshot test](https://docs.aws.amazon.com/cdk/v2/guide/testing.html#testing_snapshot) (`cdk/lib/*.test.ts`),
which we can treat as the source of truth, representing the exact resources in the stack. We can now begin the migration process.

**Pro-tip:** Annotate the existing YAML template with inline comments as part of the migration and get it reviewed by your team - it might transpire that a resource is no longer needed and can be removed, meaning there's less to migrate!

As a first step, it is a good idea to read through the template to understand if you have any [stateful resources](stateful-resources.md), as these require a bit of care.

When migrating stateful resources:
1. Identify a resource(s) to move from YAML to CDK.
2. Write the CDK and comment out/delete the resource(s) from the YAML template.
3. Run the tests:
   - If the changes are acceptable, update the snapshot.
   - If the changes are not acceptable, refactor CDK and re-run the tests.
4. With the smallest change made, we can now raise a PR, merge it, and move to the next resource(s).

That is, we can use the snapshot in a [red/green refactor cycle](https://blog.cleancoder.com/uncle-bob/2014/12/17/TheCyclesOfTDD.html).
We'll repeat this process until the YAML template is empty and can be removed.

Please also read the specific guides for:
- [for EC2 apps](./migration-guide-ec2.md)
- [for Lambdas which run on a schedule/cron](./migration-guide-scheduled-lambda.md)
- [for an API which serves requests using AWS Lambda](./migration-guide-api-with-lambda.md)

:information_source: Migration guides will be coming soon for other architectures.
Please contact DevX if you'd like to discuss the migration of an application which uses an architecture that is not listed above.
