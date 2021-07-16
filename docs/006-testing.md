# Testing

The [testing adr][internal-testing-adr] describes the approach this project has for unit tests.
It is recommended you read that first.

## Ad-hoc testing
It can be useful to test your changes in a real environment before raising a PR.

This section describes a few ad-hoc testing methods, posed as questions.

### Would your change present a clear API for users?
One of the aims of this library is to abstract the complexities of AWS behind a simple API.

You can use the [integration test project][internal-integration-project] to test changes:
  - Start watching changes to the library `npm run watch`
  - Setup the integration test project `cd integration-test && npm i`
  - Add your pattern/construct to the [stack][internal-integration-project-stack]
  - Update the library as needed

### Would your change cause resource replacement?
Another aim of this library is to enable the safe migration of existing stacks.

There are a number of stateful resources in AWS, for example:
  - databases holding data
  - load balancers with CNAMEs in DNS with a long TTL
  - S3 buckets holding data

You can use the [CDK Playground][cdk-playground] stack to test your changes against a real AWS stack.

This stack isn't user facing. Accidentally causing destruction there is ok - better there than on theguardian.com!

### Would your change update the layout of the NPM package?
It can sometimes be necessary to update the layout of the NPM package.

These changes can be quite difficult to simulate locally using `npm link` or similar.

For this reason, it can be helpful to publish a beta version to NPM. To do so:
  1. Update the `beta` branch
  1. Wait for the robots (GitHub Actions) to run and release a beta version

You can now install and test your changes with:

```
npm install @guardian/cdk@beta
```

Once you're happy with your changes, raise a PR into `main` as normal.

NOTE: The `beta` branch is just like any other branch - it may not be up to date with `main`.
It's wise to rebase it with `main` before working on it.

For more information, see the [semantic-release docs][semantic-release-docs]

<!-- only links below here -->
[internal-testing-adr]: ./architecture-decision-records/004-testing.md
[internal-integration-project]: ../tools/integration-test
[internal-integration-project-stack]: ../tools/integration-test/src/integration-test-stack.ts

[cdk-playground]: https://github.com/guardian/cdk-playground
[semantic-release-docs]: https://github.com/semantic-release/semantic-release/blob/master/docs/recipes/distribution-channels.md
