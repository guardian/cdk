**TODO: Write this in full sentences**

# Component Constructors

## Status

<!--- What is the status, such as proposed, accepted, rejected, deprecated, superseded, etc.? -->

proposed

## Context

<!--- What is the issue that we're seeing that is motivating this decision or change? -->

- This library contains a large number of classes, making up the various constructs and patterns

## Positions

<!--- What are the differing positions or proposals on this issue? -->

- Constructors should all be the same for consistency
- Constrctors should be the best fit for each class
  - this mainly means that we can sometimes miss out the id and hardcode it or that id comes after props when its defaulted

## Decision

<!-- What is the change that we're proposing and/or doing? -->

- Constructors should all accept a scope of type GuStack and an id of type string
- They can also take a props object which should be correctly typed
- Where all props are optional, the props object should be optional as a whole
- Where props are optional, a default value for the id can be provided where appropriate
- A default value should not be provided for the id value where props are required

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

- Having all constructors follow a consistent patterns makes it easier for users of the library as they always know what to expect
- The tradeoff is that some constructors may be sub-optimal
- Generally this will means passing through and id where we could have
  defaulted the value.
