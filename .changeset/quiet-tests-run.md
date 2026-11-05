---
"@guardian/cdk": minor
---

New projects created with `npx @guardian/cdk@latest new` now use the built-in Node.js test runner instead of Jest.

Existing projects are unaffected. To migrate an existing project:

1. Remove the `jest`, `ts-jest` and `@types/jest` dependencies, the `jest` block in `package.json`, and any `jest.config.js`.
2. Update the scripts in `package.json`:
   ```json
   "test": "NODE_ENV=test node --require ts-node/register --test \"lib/**/*.test.ts\"",
   "test-update": "NODE_ENV=test node --require ts-node/register --test --test-update-snapshots \"lib/**/*.test.ts\""
   ```
   `NODE_ENV=test` must be set, as the Node.js test runner does not set it (unlike Jest). GuCDK uses it to keep the `gu:cdk:version` tag static in snapshots.
3. Update your tests to use `suite` and `test` from `node:test` in place of `describe` and `it`, and the test context's snapshot assertion in place of `toMatchSnapshot`:
   ```ts
   import { suite, test } from "node:test";

   suite("The MyStack stack", () => {
     test("matches the snapshot", (t) => {
       const app = new App();
       const stack = new MyStack(app, "MyStack", { stack: "my-stack", stage: "TEST" });
       const template = Template.fromStack(stack);
       t.assert.snapshot(template.toJSON());
     });
   });
   ```
4. Delete the old Jest snapshots (`lib/__snapshots__`) and regenerate them with `npm run test-update`. Review the diff, as the snapshot file format differs.
5. In `eslint.config.mjs`, remove `...guardian.configs.jest` and disable `@typescript-eslint/no-floating-promises` for test files:
   ```js
   {
     files: ["**/*.test.ts"],
     rules: {
       // node:test's `suite` and `test` return promises that the runner handles
       "@typescript-eslint/no-floating-promises": "off"
     },
   },
   ```
