module.exports = {
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  setupFilesAfterEnv: ["./jest.setup.js"],

  // ignore this file as it's used to demonstrate custom lint rule and Jest flags unused declarations
  testPathIgnorePatterns: ["<rootDir>/eslint/rules/valid-constructors.test.ts"],
};
