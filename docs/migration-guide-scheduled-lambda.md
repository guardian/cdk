# Migration Guide (Scheduled Lambda)

This document assumes you have completed initial setup and other steps described
in the [Migration Guide](./migration-guide.md).

---

The [GuScheduledLambda](https://guardian.github.io/cdk/classes/patterns.GuScheduledLambda.html) pattern describes
a Lambda function that is triggered periodically by AWS.

Generally speaking, this architecture is used for tasks like polling/updating a datastore (e.g. a file in S3).

In most cases, it is safe for two versions of Lambdas like to this to exist/run concurrently and for simplicity
this migration guide assumes that is the case.

Some applications may not work with this approach. If it is crucial to avoid two lambdas running concurrently, you will
need to adapt these steps slightly.

## Migration Steps

1. Create an instance of `GuScheduledLambda` in your stack.

  Use your existing stack as a guide. For example, you will likely need to
  create some custom IAM permissions and add them to your
  [Lambda](https://guardian.github.io/cdk/classes/constructs_lambda.GuLambdaFunction.html).

  There's an example of this [here](https://github.com/guardian/tag-janitor/blob/9e2222d7cea6b37a48e5327efecf7b543b81af15/cdk/lib/cdk-stack.ts#L57-L62).

2. Remove the CloudFormation YAML file from your repository.

  In simple cases it may be possible to remove the whole file. If so, you
  should also be able to remove the `CfnInclude` block and the
  `@aws-cdk/cloudformation-include` dependency.

  Note that AWS will provision the new version of the Lambda function before
  the old one is removed, so the two Lambdas (and their schedules) will coexist
  for a short period of time.

3. Deploy this change using Riff-Raff.

  In order for this deployment to work Riff-Raff must identify your Lambda using tags, rather than function name.
  There's an example of this [here](https://github.com/guardian/elastic-search-monitor/pull/17/commits/6cf1684fe518c7dd7e24fc20f8047866bc6e51e3).

  In `CODE` you should test this by deploying your branch. In `PROD` you can merge
  the PR and allow Riff-Raff to deploy `main` automatically.

4. Confirm that your Lambda is still invoked on the correct schedule and that all behaviour works as expected.


