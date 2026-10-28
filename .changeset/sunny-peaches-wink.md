---
"@guardian/cdk": major
---

**Remove reliance on [Jest](https://jestjs.io/), and use `NODE_ENV=test` to mock tracking tags.**

The `gu:cdk:version` tag (and the library version info) now has a _static value_ when `NODE_ENV=test`, rather than relying on `jest.mock("@guardian/cdk/lib/constants/tracking-tag")`.
New projects created with `npx @guardian/cdk@latest new` now use the [Node.js built-in test runner](https://nodejs.org/api/test.html) instead of Jest.

## Migrating existing projects

> [!NOTE]
> Existing projects using Jest **continue to work** ([Jest sets `NODE_ENV=test` automatically](https://jestjs.io/docs/getting-started#using-babel)). The `jest.mock` of `@guardian/cdk/lib/constants/tracking-tag` is no longer needed, and the mock file has been removed from the library. To continue using Jest, remove the `jest.setup.js` file and references to it.

To migrate to the Node.js test runner:

0. **Check your Node version.** Ensure you're running _at least_ Node 24, as [snapshot testing](https://nodejs.org/api/test.html#snapshot-testing) is experimental before Node 23.

1. **Remove Jest files and dependencies:**
   - Delete `jest.config.js` and `jest.setup.js` (and the `jest` block from `package.json`, if present).
   - Remove `jest`, `ts-jest` and `@types/jest` from `devDependencies`.
   - Remove `...guardian.configs.jest` from `eslint.config.mjs`.
   - Remove `!jest.config.js` and `!jest.setup.js` from `.gitignore`.

2. **Update tests** to use the [Node.js test runner functions](https://nodejs.org/api/test.html#test-runner) instead of Jest globals:

   ```diff
   +import { suite, test } from "node:test";
    import { App } from "aws-cdk-lib";
    import { Template } from "aws-cdk-lib/assertions";
    import { MyStack } from "./my-stack";

   -describe("MyStack", () => {
   +suite("MyStack", () => {
   -  it("matches the snapshot", () => {
   +  test("matches the snapshot", (t) => {
        const app = new App();
        const stack = new MyStack(app, "MyStack");
   -    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
   +    t.assert.snapshot(Template.fromStack(stack).toJSON());
      });
    });
   ```

   Replace `expect(x).toMatchSnapshot()` with `t.assert.snapshot(x)`, and other `expect` assertions with [`node:assert`](https://nodejs.org/api/assert.html) (or `t.assert`) equivalents.

> [!WARNING]
> Existing Jest `.snap` files are **not compatible**; delete `__snapshots__` directories and regenerate them.

3. **Update the `package.json` scripts**, setting `NODE_ENV=test` explicitly as the Node.js test runner _does not_ set it:

   ```diff
    {
      "scripts": {
   -    "test": "jest",
   -    "test-update": "jest -u"
   +    "test": "NODE_ENV=test node --require ts-node/register --test \"lib/**/*.test.ts\"",
   +    "test-update": "NODE_ENV=test node --require ts-node/register --test --test-update-snapshots \"lib/**/*.test.ts\""
      },
      "devDependencies": {
   -    "@types/jest": "...",
   -    "jest": "...",
   -    "ts-jest": "..."
      }
   -  "jest": { ... }
    }
   ```

4. **Add Node types to `tsconfig.json`**.

   ```diff
    {
      "compilerOptions": {
   +    "types": ["node"]
      }
    }
   ```

5. **Regenerate snapshots** with `npm run test-update`.
