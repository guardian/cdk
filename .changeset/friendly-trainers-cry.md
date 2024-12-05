---
"@guardian/cdk": major
---

Support multiple usages of `GuGithubActionsRole` in a single AWS account

This significantly changes the resources constructed by `GuGithubActionsRole`,
specifically, **the construct will no longer instantiate a `GitHubOidcProvider`**.
This is because you can only ever have one `GitHubOidcProvider` per provider
domain (ie `token.actions.githubusercontent.com`) - while we may want multiple
instances of `GuGithubActionsRole` in an AWS account, we can't have the
`GuGithubActionsRole` construct trying to make a new `GitHubOidcProvider` with
each instance.

Consequently, you will need to instantiate the `GitHubOidcProvider` elsewhere
as a singleton. At the Guardian, we do this with https://github.com/guardian/aws-account-setup.
