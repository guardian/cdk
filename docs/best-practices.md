# Best Practices

Guardian CDK codifies best practices as defined in the [recommendations](https://github.com/guardian/recommendations)
repo.

## AWS CDK
AWS recommends [best practices](https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html) for developing and
deploying cloud infrastructure with CDK.

## Guardian CDK
Here are some best practices for using the Guardian CDK library:
- Use [snapshot testing with Jest](https://jestjs.io/docs/snapshot-testing). Snapshot testing makes it easy to review
  any stack changes when developing locally and in PRs. This enables us to catch things early, creating a shorter
  feedback loop. See the [AWS docs](https://docs.aws.amazon.com/cdk/v2/guide/testing.html#testing_snapshot) on snapshot
  testing.

- Uploading the json output file produced by running `cdk synth` is preferable to uploading a `cloudformation.yaml`
  file. Using the `cloudformation.yaml` file doesn't guarantee the file reflects the current state of your CDK
  application. However, using the json output file has the benefit that it would alert at CI if the json file hadn't
  been created properly, alerting about failure sooner.

