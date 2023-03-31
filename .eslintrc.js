module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: "@guardian/eslint-config-typescript",
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 12,
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.eslint.json"],
  },
  plugins: ["@typescript-eslint", "custom-rules", "@guardian/tsdoc-required"],
  rules: {
    "@typescript-eslint/no-inferrable-types": 0,
    "import/no-namespace": 2,
    "custom-rules/valid-constructors": 2,
    "custom-rules/experimental-classes": 0,
  },
  root: true,
  ignorePatterns: ["**/*.js", "node_modules"],
  overrides: [
    {
      files: ["src/bin/**"],
      rules: {
        "custom-rules/valid-constructors": 0,
      },
    },

    // This rule is applied within `overrides` as it only applies to the `experimental` directory, and the rule's test.
    {
      files: ["src/experimental/**", "tools/eslint/rules/experimental-classes.test.ts"],
      rules: {
        "custom-rules/experimental-classes": 2,
      },
    },
    {
      files: ["src/patterns/**"], // Incremental rollout.
      rules: {
        "@guardian/tsdoc-required/tsdoc-required": 2,
      }
    }
  ],
};
