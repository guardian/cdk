## What does this change?
<!-- A PR should have enough detail to be understandable far in the future. e.g what is the problem/why is the change needed, how does it solve it and any questions or points of discussion. Prefer copying information from a Trello card over linking to it; the card may not always exist and reviewers may not have access to the board. -->

## How to test
<!-- Provide instructions to help others verify the change. This could take the form of "On PROD, do X and witness Y. On this branch, do X and witness Z. " -->
<!-- FYI you can use https://github.com/guardian/cdk-playground to test changes before publishing to NPM. -->

## How can we measure success?
<!-- Do you expect errors to decrease? Do you expect user journeys to be simplified? What can be used to prove this? A filtered view of logs or analytics, etc? -->

## Have we considered potential risks?
<!-- What are the potential risks and how can they be mitigated? Does an error require an alarm? Should user help, infosec, or legal be informed of this change? Is private information guarded? Do we need to add anything in the backlog? -->

## Checklist

- [ ] I have listed any breaking changes, along with a migration path [^1]
- [ ] I have updated the documentation as required for the described changes [^2]

[^1]: Consider whether this is something that will mean changes to projects that have already been migrated, or to the CDK CLI tool. If changes are required, consider adding a checklist here and/or linking to related PRs.
[^2]: If you are adding a new construct or pattern, has new documentation been added? If you are amending defaults or changing behaviour, are the existing docs still valid?
