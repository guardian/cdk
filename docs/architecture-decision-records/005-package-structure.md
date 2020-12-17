# Package Structure

## Status

<!--- What is the status, such as proposed, accepted, rejected, deprecated, superseded, etc.? -->

proposed

## Context

<!--- What is the issue that we're seeing that is motivating this decision or change? -->

This project defines a library of components build on top of the AWS CDK and aiming to improve the user experience for managing infrastructure at the Guardian. As the library continues to grow, it is important that the library is structured sensibly, both for developers maintaining the library and those using it.

## Positions

<!--- What are the differing positions or proposals on this issue? -->

1. Match the structure of the different CDK libraries

   AWS CDK is publishing as numerous individual libraries split by resource groups (e.g. `iam`, `ec2`). Although we are publishing as one library, we could mirror this structure in our directories. This would mean that a user who was familiar with the CDK would be able to take a good guess as to where a component lived in this project.

   It also means that we don't have to make decisions about where components should live as we can just follow what AWS do.

2. We could define our own style

   This library doesn't contain anywhere near the full range of components that the AWS CDK provides. As such, following that structure may not be the best choice here.

   While it does not provide the range of components, this library does provide multiple implementations of the same underlying resource (e.g. for the `Policy` construct, `GuLogShippingPolicy`, `GuSSMRunCommandPolicy`, `GuGetS3ObjectPolicy`).

## Decision

<!-- What is the change that we're proposing and/or doing? -->

The top level directories with the `constructs` directory should mirror the AWS CDK library names.

Each directory should contain an `index.ts` file which exports all of the classes within it.

Files within these directories can either be at the top level or nested within directories. Where nested directories exist, they should only be used for grouping multiple implementations of the same underlying construct. For example, `GuLogShippingPolicy`, `GuSSMRunCommandPolicy`, `GuGetS3ObjectPolicy` could all be in seperate files within the `constrcuts/iam/policies` directory. These directories should also export all memebers in an `index.ts` file.

Patterns can all be defined at the top level within the `patterns` directory. They should all be exported in the `index.ts` file so that they can all be imported from `@guardian/cdk`

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

Having a clearly defined project structure makes it easier for developers of the library to find, add and maintain components. It also makes for a more intuitive experience for users of the library as they know where to look and import components from.
