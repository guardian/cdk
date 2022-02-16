# Migration Guide

This guide describes how to migrate an existing Cloudformation stack (and
template) to @guardian/cdk.

If you are starting from scratch, see the [new project guide](TODO).

---

## Account readiness

`@guardian/cdk` patterns and constructs rely on parameter store values for
things like VPC identifiers and dist buckets. To ensure AWS your account is set
up correctly, run:

    npx @guardian/cdk account-readiness --profile [profile]

Then follow the instructions for any errors.

## Initial setup

Firstly, ensure you are running a recent version of Node and then initialise a
new CDK app from within your repo:

    npx @guardian/cdk new --app [app] --stack [stack] --yaml-template-location cfn.yaml

> Tip: run `npx @guardian/cdk new -h` to find out more about the `app` and
> `stack` flags.

This will create a new CDK (Typescript) app that simply wraps your existing
Cloudformation template.

Pay attention to the output of the command as it may describe further manual
steps at this point.

Once done, we recommend running `git diff` to see the full set of changes.

Finally, confirm that your new CDK stack is not materially different from your
existing stack by running a Cloudformation diff:

    cd cdk
    ./script/diff -s [AWS stack name] -p [profile]

where `AWS stack name` is the full name of the target Cloudformation Stack in
AWS.

At this point we recommend running CDK synth as part of your CI.

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
- [for Lambdas](./migration-guide-lambda.md)
