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

[Snapshot testing with the Node.js test runner](https://nodejs.org/api/test.html#snapshot-testing) makes it easy to review any stack changes when
developing locally and in PRs. This enables us to catch things early, creating a shorter feedback loop.
`npm run test-update`/`yarn test-update` will update the snapshots. See the
[AWS docs](https://docs.aws.amazon.com/cdk/v2/guide/testing.html#testing_snapshot) on snapshot testing.

#### Mocking `gu:cdk:version`

The `@guardian/cdk` library follows [Semantic Versioning](https://semver.org/).

GuCDK will add the `gu:cdk:version` tag to resources to aid usage tracking.
This number changes with every version and as a result automatic version upgrade PRs (e.g. via Dependabot) will fail their snapshot tests.
To reduce friction, GuCDK uses a static value (`TEST`) for this tag when `NODE_ENV=test`, resulting in snapshots that don't change between versions.
The Node.js test runner does not set `NODE_ENV`, so the generated `test` and `test-update` scripts set it explicitly.
Update your snapshots (`npm run test-update`).

The `gu:cdk:version` tag should now be:

```json5
{
  "Key": "gu:cdk:version",
  "PropagateAtLaunch": true,
  "Value": "TEST", // <-- would otherwise be the version number of @guardian/cdk in use
}
```

Note:
  - This mock only affects tests. The `gu:cdk:version` tag in the final template created from a `cdk synth` will have the correct value
  - This mock is automatically configured when using the GuCDK project generator

✨ With `gu:cdk:version` mocked, snapshot tests run during CI, you can feel confident about merging Dependabot PRs that bump `@guardian/cdk` once CI passes ✨.

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
