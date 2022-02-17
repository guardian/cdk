# Contributing

We encourage all contributors to read this document fully.

- [Local setup](#local-setup)
- [Decision Records](#decision-records)
- [Development principles](#development-principles)
- [Testing changes](#testing-larger-changes)
- [Releasing](#releasing)

The Guardian has a Code of Conduct for all contributors, which can be found
[here](https://github.com/guardian/.github/blob/main/CODE_OF_CONDUCT.md).

## Local setup

We follow the
[`script/task`](https://github.com/github/scripts-to-rule-them-all) pattern,
find useful scripts within the [`script`](../script) directory for common tasks.

- `./script/setup` to install dependencies
- `./script/start` to run the Jest unit tests in watch mode
- `./script/start-docs` to generate documentation and view in the browser
- `./script/lint` to lint the code using ESLint
- `./script/test` to run the Jest unit tests
- `./script/build` to compile TypeScript to JS
- `./script/cli-docs` to update the CLI documentation in this file

There are also some other commands defined in `package.json`:

- `npm run lint --fix` attempt to autofix any linter errors
- `npm run format` format the code using Prettier
- `npm run watch` watch for changes and compile

However, it's advised you configure your IDE to format on save to avoid horrible
"correct linting" commits.

### Decision Records

[Architecture Decisions
Records](https://github.com/joelparkerhenderson/architecture-decision-record)
are files where we can document the decisions we make around any form of
structure, architecture or approach. By documenting them in this way, we can
preserve the thought process behind all the decisions whilst also laying out
formally the preferences for all developers working on the library.

The [docs/architecture-decision-records
directory](../docs/architecture-decision-records/) contains the records for
`@guardian/cdk`.

## Development principles

### Tests

Use direct assertions for constructs and snapshots for patterns (and stacks).
See the [Testing ADR](./architecture-decision-records/004-testing.md) for fuller
discussion here.

### Backwards compatibility

Releases will automatically bump versions as required.

At the time of writing, the library is still quite subject to breaking changes.
However, bear in mind that breaking changes, particularly those to our core
patterns, create migration burden for our teams; avoid them where possible.

In the near-future we are likely to adopt a stricter approach in this area.

## Testing larger changes

Depending on the nature of your change, you may want to test things on a 'real'
stack, or even publish a beta version of the library to NPM.

This section describes a few ad-hoc testing methods, posed as questions.

### Would your change present a clear API for users?

One of the aims of this library is to abstract the complexities of AWS behind a simple API.

You can use the [integration test project](../tools/integration-test) to test
changes:

- Start watching changes to the library `npm run watch`
- Setup the integration test project `cd integration-test && npm i`
- Add your pattern/construct to the
  [stack](../tools/integration-test/src/integration-test-stack.ts)
- Update the library as needed

### Would your change cause resource replacement?

Another aim of this library is to enable the safe migration of existing stacks.

There are a number of stateful resources in AWS, for example:

- databases holding data
- load balancers with CNAMEs in DNS with a long TTL
- S3 buckets holding data

You can use the [CDK Playground](https://github.com/guardian/cdk-playground)
stack to test your changes against a real AWS stack.

This stack isn't user facing. Accidentally causing destruction there is ok - better there than on theguardian.com!

### Would your change update the layout of the NPM package?

It can sometimes be necessary to update the layout of the NPM package.

These changes can be quite difficult to simulate locally using `npm link` or similar.

For this reason, it can be helpful to publish a beta version to NPM. To do so:

1. Update the `beta` branch
1. Wait for the robots (GitHub Actions) to run and release a beta version

You can now install and test your changes with:

```
npm install @guardian/cdk@beta
```

Once you're happy with your changes, raise a PR into `main` as normal.

NOTE: The `beta` branch is just like any other branch - it may not be up to date with `main`.
It's wise to rebase it with `main` before working on it.

## Releasing

✨ TL;DR We release new versions of the library to NPM automagically ✨

We use [semantic-release](https://github.com/semantic-release/semantic-release)
and
[guardian/actions-merge-release-changes-to-protected-branch](https://github.com/guardian/actions-merge-release-changes-to-protected-branch)
to automate releases.

To release a new version:

1. Raise a PR. The PR title must follow the
   [Angular](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commits)
   / [Karma](http://karma-runner.github.io/6.1/dev/git-commit-msg.html) format.
   Don't worry, CI checks this!
1. Once reviewed and approved, merge your PR.
1. Wait for the robots to:
   - Use your structured commit to automatically determine the next version
     number (following [semantic versioning](https://semver.org/)).
   - Release a new version to npm and update `package.json`.
1. Enjoy a comment on your PR to inform you that your change has been released.
