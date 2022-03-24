# Best Practices

Guardian CDK codifies best practices as defined in the [recommendations](https://github.com/guardian/recommendations)
repo.

## AWS CDK
AWS recommends [best practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html) for developing and
deploying cloud infrastructure with CDK.

## Guardian CDK

Here are some recommendations for using the Guardian CDK library:
- Use CI to run snapshot tests
- Use CI to generate cloudformation files
- Upload generated json files from cdk.out

### Snapshot testing
[Snapshot testing with Jest](https://jestjs.io/docs/snapshot-testing) makes it easy to review any stack changes when
developing locally and in PRs. This enables us to catch things early, creating a shorter feedback loop. See the
[AWS docs](https://docs.aws.amazon.com/cdk/v2/guide/testing.html#testing_snapshot) on snapshot testing.

### Generating the cloudformation template
CI should generate files in the cdk.out directory (make sure to add this to .gitignore). CDK will produce json files by
default. The json template can be piped to disk as a cloudformation.yaml file, but this is not advisable. Instead, it is
recommended to upload the json output.
