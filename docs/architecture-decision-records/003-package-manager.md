# Package Manager

## Status

<!--- What is the status, such as proposed, accepted, rejected, deprecated, superseded, etc.? -->

proposed

## Context

<!--- What is the issue that we're seeing that is motivating this decision or change? -->

The project can either use `npm` or `yarn` as the package manager. This should be an either/or situation but a number of issues have been encountered when using `yarn` including:

- `yarn login` still prompts for a password at release time which doesn't work with `np`
- publishing with `yarn` leaves only the `index.js` file in the `lib` directory

## Positions

<!--- What are the differing positions or proposals on this issue? -->

1. Use `yarn` and fix the existing issues

   `Yarn` is more widely used across the team's, and wider department's, projects so it would present a more consistent approach. There are more examples of common tasks written in `yarn` from our existing projects and developer's are more likely to default to running `yarn` commands.

2. Use `npm`

   Given that issues have been encountered using `yarn` and the fact that `npm` provides a working alternative with no obvious drawbacks (save the more common use of `yarn` in the department), it's not worth fixing the `yarn` issues.

3. Use `npm` but use the script pattern to make it (more) transparent to the user

   The [script pattern](https://github.com/github/scripts-to-rule-them-all) abstracts the choice of package manager (and the implementation of various tasks) away from the user. This would allow whichever tool was the best fit to be used across all projects whilst maintaining a consistent experience for developers.

## Decision

<!-- What is the change that we're proposing and/or doing? -->

Use npm with the script pattern.

Any common tasks (e.g. `lint`, `test`, `build`) should have a script defined in the `script` directory. Any scripts run by CI should also be stored in this directory.

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

Using the script pattern allows us to present a consistent interface whilst using whichever tool works best. Further to that, it makes it easier for new developers coming to a project as they don't have to know the specific commands to perform each task. Instead, they can easily see the available commands and run them simply by name.

This pattern becomes increasingly useful the more projects it is used in as developers get used to going to the `./script` directory rather than running command directly. Without common usage across the team it risks becoming a third standard rather than a replacement for the previous two ([Relevant XKCD](https://xkcd.com/927/)).
