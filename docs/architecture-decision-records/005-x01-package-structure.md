# Package Structure - Extension 01

## Status
Proposed.

## Context
This is an extension to the [package structure ADR](./005-package-structure.md)
and describes how this project can support early and/or experimental features from within the team and from external contributions.

These features should be considered "in development, but with an unstable API".
Supporting these types of features would allow for their inclusion in a published NPM library,
simplifying any testing or dog-fooding "in the wild".

There is no commitment to make these features to stable in future. For this reason, we'll term them "experimental" rather than "alpha".

The process of authoring experimental features should offer little friction for contributors, consumers, and maintainers.

## Positions
Each position will be evaluated on the following criteria:
- Contributing new experimental features
- Consuming an experimental feature
- Long term maintenance

### 1. Create a separate NPM package
Named `@guardian/cdk-experiments`, or similar, this package would hold these features and would be separate from the core `@guardian/cdk` package.

This additional package would likely require converting the repository to a mono-repo using NPM Workspaces, with at least three workspaces:
- `common` for shared code (not published)
- `cdk` for stable code (published)
- `cdk-experiments` for experimental code (published)

#### Score
- :white_check_mark: Contributing new experimental features

  Use of Workspaces and shared code would provide a familiar DX to the current repository, in that typechecking, linting, testing etc. will continue to be available.

- :white_check_mark: Consuming an experimental feature

  Consumption would require explicit installation of a new NPM package, making it clear that an experimental feature is in use:

  ```ts
  import { StableFeature } from "@guardian/cdk";
  import { EarlyFeature } from "@guardian/cdk-experiments";
   ```

  There may be compatability complexities in this solution.
  Today, when a project uses `@guardian/cdk`, the version of AWS CDK in use must _exactly match_ those used by `@guardian/cdk`.
  If `@guardian/cdk-experiments` uses a later version of AWS CDK, consuming projects must first update `@guardian/cdk` before they can make use of `@guardian/cdk-experiments`.
  Use of `peerDependencies` would likely solve this, however.

- :x: Long term maintenance

  NPM Workspaces can yield complex directory structures and configuration, in particular when creating a workspace for shared code.

  The release process could get complex too, in particular around automation.
  Today, releases are automated using [semantic-release](https://github.com/semantic-release/semantic-release), this handles the creation of structured release notes based on commit messages.
  In a world of multiple, packages, should there be one set of release notes that details all the changes? Or a set of release notes per package? And does semantic-release support this?

  There are ambitions to adopt [JSII](https://github.com/aws/jsii) for cross language publishing. Would we publish both packages? Or just the core package?

### 2. Host experiments in an `experimental` directory
Published within the `@guardian/cdk` package, experimental features will be defined within an `experimental` directory.

#### Score
- :white_check_mark: Contributing new experimental features

  Contributing new experimental features will be similar to contributing stable features, with the only difference being the directory.
  Typechecking, linting, testing etc. will continue to be available.

- :white_check_mark: Consuming an experimental feature

  As experimental features are published directly within the `@guardian/cdk` package, consumption would look similar to any other pattern or construct:

  ```ts
  import { StableFeature } from "@guardian/cdk";
  import { EarlyFeature } from "@guardian/cdk/experimental";
  ```

  As the experiments are included in the `@guardian/cdk` package, compatibility is a given.

  There is a risk that usage of an experimental feature goes unnoticed however, especially as IDEs typically fold import statements.

- :white_check_mark: Long term maintenance

  An additional directory has minimal maintenance cost.

## Decision
Host experiments in an `experimental` directory.

## Consequences
An `experimental` directory offers similar structure and explicitness to a separate package, at a lower maintenance cost and increased chance of JSII adoption in the future.

As noted, there is a risk that experimental features go unnoticed.
We could somewhat mitigate this by use of a naming convention: prefer `MyConstructExperimental` over `MyConstrct`.
Additionally, the docs for the experimental features should also flag they are experimental.

An natural extension to this directory structure is to create the following top level directories:
- `public` holding patterns and constructs for downstream consumers. These will have a stable API.
- `internal` holding functions for use within the library itself, not intended for downstream consumers.
- `experimental` holding patterns and constructs for downstream consumers. The stability of their API is not guaranteed.

Lastly, we should also ensure we are able to track usage of experimental features so that promotion or deprecation plans can be created.
