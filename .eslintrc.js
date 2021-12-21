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
  plugins: ["@typescript-eslint", "custom-rules"],
  rules: {
    "@typescript-eslint/no-inferrable-types": 0,
    "import/no-namespace": 2,
    "custom-rules/valid-constructors": 2,
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
  ],
};
