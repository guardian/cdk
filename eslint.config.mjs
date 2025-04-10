import guardian from '@guardian/eslint-config';
// eslint-disable-next-line import/default -- can we switch to https://github.com/gajus/eslint-plugin-jsdoc
import tsdocRequired from '@guardian/eslint-plugin-tsdoc-required';
import customRules from 'eslint-plugin-custom-rules';

export default [
    ...guardian.configs.recommended,
    ...guardian.configs.jest,
    {
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.eslint.json",
                projectService: false
            }
        },
        rules: {
            "custom-rules/valid-constructors": "error",
        },
        plugins: {
            "@guardian/tsdoc-required": tsdocRequired,
            "custom-rules": customRules
        }
    },
    {
        files: ["src/bin/**"],
        rules: {
          "custom-rules/valid-constructors": "off",
        },
      },
      // This rule is applied within `overrides` as it only applies to the `experimental` directory, and the rule's test.
      {
        files: ["src/experimental/**", "tools/eslint/rules/experimental-classes.test.ts"],
        rules: {
          "custom-rules/experimental-classes": "error",
        },
      },
      {
        files: ["src/patterns/**"],
        rules: {
          "@guardian/tsdoc-required/tsdoc-required": "error",
        }
      }
];