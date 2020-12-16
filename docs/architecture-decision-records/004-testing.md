# Testing

## Status

proposed

## Context

<!--- What is the issue that we're seeing that is motivating this decision or change? -->

One of the benefits of writing our infrastructure in a fully fledged programming language is the ability to write reusable components which can be tested. This library defines those components, both in the form of constructs and patterns (see [001-constructs-and-patterns](./001-constructs-and-patterns.md) for more details).

There are two main strategies that can be used to unit test these components.

Snapshot tests synthesise a given stack and compare the output to a previous version that has been verified by the user and checked into the repository. If there are any changes, the test fails and the user is displayed the diff to either fix or update the stored snapshot.

    [+] Quick and easy to write

    [+] Pick up any changes to the output cloudformation (particularly useful for unintended side effects)

    [-] A change to the component may cause many unrelated tests to also fail

    [-] When testing different permutations of a component, a number of snapshots will be created, each of which contains a certain amount of information which is irrelevant to the particular test. This adds some extra effort to understand what is relevant to the test which you're looking at

    [-] Snapshots are easy to update which, especially when multiple are affected by a change, makes it easy to accidentally update them incorrectly. Further to this, as the snapshot (which is essentially the assertion) is stored in a different file, it's not immediately obvious if the assertions are valid

Direct Assertions use the different assertions provided by the test framework to test specific functionality. For example, asserting that a property exists or that an array contains a particular value.

    [+] Each test only contains the relevant assertions for the test, making it easier to understand the consequence of settings certain props

    [+] Changes will only fail tests that cover that particular area

    [-] More complex and time consuming to write

## Positions

<!--- What are the differing positions or proposals on this issue? -->

1. Use snapshots for everything

2. Use direct assertions for everything

3. Use a combination of both for everything

4. Use direct assertions for constructs and snapshots for patterns (and stacks)

## Decision

<!-- What is the change that we're proposing and/or doing? -->

Use direct assertions for constructs and snapshots for patterns (and stacks)

_This decision is a recommendation for the general approach. There may be some cases where using a different approach is more applicable for a given test._

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

Haivng a consistent style for tests makes it easier to decide what and how to test each component. This approach should ensure that the unit tests provide good coverage whilst being easy to understand and maintain.

As direct assertion tests are more time consuming and complex to write than snapshots, this will create some additional work.
