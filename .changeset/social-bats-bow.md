---
"@guardian/cdk": major
---

Mock Tracking and Library version values using NODE_ENV

When `NODE_ENV=test` (set automatically by Jest), the `gu:cdk:version` tracking tag is `TEST` and `LibraryInfo.VERSION` is `1.0.0`. Mocking is no longer needed.

## Migration

1. Delete `jest.setup.js`.
2. Remove `"./jest.setup.js"` from `setupFilesAfterEnv` in your Jest config (`jest.config.js` or `package.json`).
3. Remove `!jest.setup.js` from `.gitignore`, if present.
4. Ensure tests run with `NODE_ENV=test` (Jest does this by default), then update your snapshots (`npm test -- -u`).

If everything has worked correctly you should not see any change to your snapshots.
