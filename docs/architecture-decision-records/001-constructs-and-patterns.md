**TODO: Write this in full sentences**

# Constructs and Patterns

## Status

<!--- What is the status, such as proposed, accepted, rejected, deprecated, superseded, etc.? -->

proposed

## Context

<!--- What is the issue that we're seeing that is motivating this decision or change? -->

- It's possible to abstract at many levels.
- AWS already provide multiple levels:
  - CfnComponent - maps 1-to-1 with a cfn resource
  - Construct - create 1 to many resources but all grouped on a similar concept. e.g an RDS instance construct may also create a parameters object which it references, rather than requiring it to be defined separately.
- Plus lots of open source patterns which group Constructs to provide an templated stacks
  - e.g. an ec2 app stack might give you ASG, LB, SG
  - likely composed of multiple constructs under the hood

## Positions

<!--- What are the differing positions or proposals on this issue? -->

- Provide constructs and patterns
- Any other option?

## Decision

<!-- What is the change that we're proposing and/or doing? -->

- Produce both constructs and patterns
- Patterns for common Guardian stacks
- Utility constructs covering common patterns for each construct (e.g. policy -> SSM policy, S3Artifact Policy, LogShippingPolicy)

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

- Clear definition makes library use and maintainence easier.
- Some difficult where components are across the boundary?
