# Best Practices

Guardian CDK codifies best practices as defined in the [recommendations](https://github.com/guardian/recommendations)
repo.

Here are some best practices for using this library:
- Use [snapshot testing with Jest](https://jestjs.io/docs/snapshot-testing). Snapshot testing makes it easy to review
  any stack changes when developing locally and also in PRs.

- Uploading the json output file produced by running `cdk synth` is preferable to uploading a `cloudformation.yaml`
  file. Using the `cloudformation.yaml` file doesn't guarantee the file reflects the current state of your CDK
  application. However, using the json output file has the benefit that it would alert at CI if the json file hadn't
  been created properly, alerting about failure sooner.

