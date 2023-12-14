---
"@guardian/cdk": major
---

Removes supports for Stack Sets (added in #977) as it's no longer used,
because of a lack of CD tooling support for deploying Stack Sets.

Removing unused code means less code to maintain, and reduced complexity.

Should Stack Sets be needed in future, https://github.com/cdklabs/cdk-stacksets offers an alternative approach to creating them in CDK.
