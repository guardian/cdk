# Integration Test

This is a really simple integration test for the @guardian/cdk library.

The purpose of this is to ensure:
- the library can be installed into a project
- a stack can be synthed without error

This is in reaction to [#356](https://github.com/guardian/cdk/pull/356) and [#365](https://github.com/guardian/cdk/pull/365) which broke the package.
The integration test helps increase confidence in any future changes to the library, _before_ publishing them.
That is, the feedback loop is shortened.

## A note about linting
As we're not using a lockfile, our dependency versions are non-deterministic.

This means we can install versions of eslint plugins with updated rules that cause the project to fail the lint check.

Rather than [firefight](https://github.com/guardian/cdk/pull/564) this, we're simply not linting this project as:
  - This project is never consumed by anyone
  - This project doesn't run anywhere
  - This project doesn't get updated too often
  - Understanding the original lockfile issues is a time sink
