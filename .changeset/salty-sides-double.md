---
"@guardian/cdk": minor
---

Remove dependency `@oclif/core`.

We were using `@oclif/core` to create a spinner with the new project CLI. See https://github.com/oclif/core/tree/main/src/ux#action.
We currently have some open vulnerabilities with `minimatch`, which `@oclif/core` adds transitively.
This change removes `@oclif/core` in favour of `console.log` statements.
