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

<!-- only links below here -->
[internal-testing-adr]: ./architecture-decision-records/004-testing.md
[internal-integration-project]: ../integration-test
[internal-integration-project-stack]: ../integration-test/src/integration-test-stack.ts

[cdk-playground]: https://github.com/guardian/cdk-playground
