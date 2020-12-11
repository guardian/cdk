**TODO: Write this in full sentences**

# Package Manager

## Status

<!--- What is the status, such as proposed, accepted, rejected, deprecated, superseded, etc.? -->

proposed

## Context

<!--- What is the issue that we're seeing that is motivating this decision or change? -->

- We can either use npm or yarn
- This should be an either or situation but we've had some problems.
- Yarn is (maybe) more commonly used across the department
- It doesn't work for us with our current config
  - `yarn login` still prompts for a password at release time which doesn't work with `np`
  - publishing with `yarn` leaves only the `index.js` file in the `lib` directory
- We could spend time fixing this but is it worth it?
- script pattern makes this (more) transparent

## Positions

<!--- What are the differing positions or proposals on this issue? -->

- Make it work with yarn
- Stick with npm
- Stick with npm but use the script pattern to make it (more) transparent to the user

## Decision

<!-- What is the change that we're proposing and/or doing? -->

- Use npm with the script pattern

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

- Using script pattern everywhere makes this easier (but only if we do it everywhere)
- Relies on people knowing the abstraction
