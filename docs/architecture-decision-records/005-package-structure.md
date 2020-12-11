**TODO: Write this in full sentences**

# Package Structure

## Status

<!--- What is the status, such as proposed, accepted, rejected, deprecated, superseded, etc.? -->

proposed

## Context

<!--- What is the issue that we're seeing that is motivating this decision or change? -->

- We're building a big old library of components
- As this continues to grow, it's important to have a sensible architecture both for development and usage.

## Positions

<!--- What are the differing positions or proposals on this issue? -->

- We could follow the AWS CDK library setup
  - This would make it easier for users as they can expect to find GuComponents in the same place they would get them from AWS.
  - It also means we can just rely on the AWS CDK library deciding what a sensible structure is
- We could define our own style
  - We're not defining any where near the number of components that are in the AWS CDK so that might not be the most logical structure
  - We're also going to have lots of Gu invocations of one cdk type (e.g. policy -> SSM policy, S3Artifact Policy) so where do we put those

## Decision

<!-- What is the change that we're proposing and/or doing? -->

- It should roughly replicate the structure of the cdk library at the top level (e.g. core, ec2)
- Below that, what should we do?

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

- Having a clearly defined project structure makes it easier to use
