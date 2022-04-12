# Migration Guide

This guide describes how to migrate an existing Cloudformation stack (and
template) to `@guardian/cdk`.

If you are starting from scratch, see the [new project guide](TODO).

---

## Account readiness

`@guardian/cdk` patterns and constructs rely on parameter store values for
things like VPC identifiers and dist buckets. To ensure AWS your account is set
up correctly, run:

    npx @guardian/cdk@latest account-readiness --profile [profile]

Then follow the instructions for any errors.

## Initial setup

First ensure you are running a recent version of Node.
Then initialise a new CDK app from within your repo:

    npx @guardian/cdk@latest new --app [app] --stack [stack] --stage [stage] --yaml-template-location /path/to/cfn.yaml

> Tip: Run `npx @guardian/cdk@latest new -h` to find out more about the `app`,`stack` and `stage` flags.

This will create a new CDK (Typescript) app that simply wraps your existing Cloudformation template.

For example, to migrate an app called `riff-raff` that has a `CODE` and `PROD` stage, we'd do:

```bash
npx @guardian/cdk@latest new \
  --app riff-raff \
  --stack deploy \
  --stage CODE \
  --stage PROD \
  --yaml-template-location cloudformation/riff-raff.template.yaml
```

Pay attention to the output of the command as it may describe further manual
steps at this point.

Once done, we recommend running `git diff` to see the full set of changes.

Finally, confirm that your new CDK stack is not materially different from your
existing stack by running a Cloudformation diff:

    cd cdk
    ./script/diff -s [AWS stack name] -p [profile]

where `AWS stack name` is the full name of the target Cloudformation Stack in
AWS.

You might find that the diff contains a lot of noise due to tags that are automatically added by `@guardian/cdk`.
Tag changes will not cause disruption to your infrastructure. 
If desired, you can view a diff which excludes the tagging changes by temporarily [amending your stack's props](https://github.com/guardian/cdk-playground/blob/26af40f6432cb94b3e5ef34648d422a7a6ee6b33/cdk/bin/cdk.ts#L6).

Once you are happy with the diff, we recommend running CDK synth as part of your CI process.

## Migrating resources

After initial setup, you have something like this:

    CDK(cfn.yaml) -> cfn.yaml

That is, CDK is merely wrapping an existing template. This is useful as a
starting point. For example, to integrate with CI/CD.

The end goal, though, is for CDK to do all of the work:

    CDK -> cfn.yaml

To get there, we need to migrate resources defined in the old cfn.yaml template
into CDK (Typescript).

How best to do this will depend on the details of your application. Further
advice can be found here:

- [for EC2 apps](./migration-guide-ec2.md)
- [for Lambdas which run on a schedule/cron](./migration-guide-scheduled-lambda.md)

Migration guides will be coming soon for other Lambda-based architectures. Please contact DevX if you'd like to discuss the migration of an application which uses an architecture that is not listed above.
