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
CI should generate files in the `cdk.out` directory (make sure to add this to `.gitignore`).

CDK will produce json files by default, one per stage. These should be wired into the `riff-raff.yaml`:

```yaml
# ... other required properties
deployments:
  cloudformation:
    type: cloud-formation
    templateStagePaths:
      CODE: MyApp-CODE.template.json
      PROD: MyApp-PROD.template.json
    # ... other required properties
```
