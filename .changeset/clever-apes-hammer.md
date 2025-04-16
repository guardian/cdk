---
"@guardian/cdk": patch
---

Upgrade to ESLint 9.x and @guardian/eslint-config

## Upgrade Guide

1. Update required dependencies

```bash
# NPM
npm uninstall @guardian/eslint-config-typescript --save-dev
npm install eslint@^9.24.0 --save-dev
npm install @guardian/eslint-config@^11.0.0 --save-dev

# Or YARN
yarn remove @guardian/eslint-config-typescript --dev
yarn add eslint@^9.24.0 --dev
yarn add @guardian/eslint-config@^11.0.0 --dev
```

2. Switch to using a flat [eslint config](https://eslint.org/docs/latest/use/configure/migration-guide)

A lot of the config that we used to define is now available by default in the shared` @guardian/eslint-config` library.

```bash
# Remove deprecated .eslintrc config
rm .eslintrc

# Replace with newer eslint.config.mjs
# Most config options we want are enabled by default now in `@guardian/eslint-config` so we can
# have a fairly minimal eslint config file.
cat >> eslint.config.mjs << 'END'
import guardian from '@guardian/eslint-config';

export default [
	...guardian.configs.recommended,
	...guardian.configs.jest
];
END
```

3. Remove [unsupported](https://eslint.org/docs/latest/use/configure/migration-guide#cli-flag-changes) `--ext` flag from `lint` script in `package.json`

```bash
# Remove --ext .ts from `npm run lint` script
sed -i '' '/--ext .ts/d' ./package.json
```
