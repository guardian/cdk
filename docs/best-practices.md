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

#### Mocking
GuCDK will add tags to resources:
  - `gu:cdk:version` represents the version of GuCDK being used. This helps with usage tracking.
  - `gu:build-number` represents the build number from CI. This helps when triaging incidents.

To reduce friction, GuCDK ships mocks that can be used with Jest to make snapshot tests simpler. To use them:

1. Create `jest.setup.js` and add the global mocks:

   ```javascript
   jest.mock("@guardian/cdk/lib/constants/tracking-tag");
   jest.mock("@guardian/cdk/lib/constants/build-number-tag");
   ```

2. Edit `jest.config.js` setting the [`setupFilesAfterEnv`](https://jestjs.io/docs/configuration#setupfilesafterenv-array) property:

   ```javascript
   module.exports = {
     setupFilesAfterEnv: ["./jest.setup.js"],
   };
   ```

3. Update your snapshots:

   ```shell
   jest -u
   ```

   The value of these tags within your snapshot files should now be `"TEST"`.

Note:
  - Mocks only affect tests. The final template created from a `cdk synth` will have the correct values.
  - The above mocks are automatically configured when using the GuCDK project generator.

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
