---
"@guardian/cdk": patch
---

Fix `new` command so generated projects pass their own lint check. The `eslint --fix` step passed `"lib/** bin/**"` as a single argument to `spawn` (with `shell: false`), so the globs never matched and no autofix ran. The globs are now passed as separate arguments. Additionally, generated import statements now place Node built-in modules (e.g. `path`) before third-party imports to satisfy the `import/order` rule.
