**TODO: Write this in full sentences**

# Testing

## Status

proposed

## Context

<!--- What is the issue that we're seeing that is motivating this decision or change? -->

- One of the benefits of writing our infrastructure in a fully fledged programming language is the ability to write reusable components which can be tested.
- This library defines those components, both in the form of constructs and patterns
  - see [001-constructs-and-patterns](./001-constructs-and-patterns.md) for more details
- There are two main strategies that can be used to unit test these components.

  - Snapshots
    [+] Quick and easy to write

    [+] Pick up any changes to the output cloudformation (particularly useful for unintended side effects)

    [-] A change to the component may cause many unrelated tests to also fail

    [-] When testing different permutations of a component, a number of snapshots will be created, each of which contains a
    certain amount of information which is irrelevant to the particular test. This adds some extra effort to understand what
    is relevant to the test which you're looking at

    [-] Snapshots are easy to update which, especially when multiple are affected by a change, makes it easy to accidentally
    update them incorrectly. Further to this, as the snapshot (which is essentially the assertion) is stored in a different file,
    it's not immediately obvious if the assertions are valid

  - Direct Assertions

    [+] Each test only contains the relevant assertions for the test, making it easier to understand the consequence of settings certain props

    [+] Changes will only fail tests that cover that particular area

    [-] More complex and time consuming to write

## Positions

<!--- What are the differing positions or proposals on this issue? -->

- Use snapshots for everything
- Use direct assertions for everything
- Use a combination of both for everything
- Use direct assertions for constructs and patterns for patterns (and stacks)

## Decision

<!-- What is the change that we're proposing and/or doing? -->

- Use direct assertions for constructs and patterns for patterns (and stacks)

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

- We have a consistent style for testing which makes it easier to decide how to test
- It might take more effort if we commit to direct assertions for constructs
