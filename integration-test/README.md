# Integration Test

This is a really simple integration test for the @guardian/cdk library.

The purpose of this is to ensure:
- the library can be installed into a project
- a stack can be synthed without error

This is in reaction to [#356](https://github.com/guardian/cdk/pull/356) and [#365](https://github.com/guardian/cdk/pull/365) which broke the package.
The integration test helps increase confidence in any future changes to the library, _before_ publishing them.
That is, the feedback loop is shortened.
