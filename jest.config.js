module.exports = {
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  setupFilesAfterEnv: ["./jest.setup.js"],

  // ignore this file as it's used to demonstrate custom lint rule and Jest flags unused declarations
  testPathIgnorePatterns: ["<rootDir>/eslint/rules/valid-constructors.test.ts"],

  /*
  Ignore `lib` to prevent a 'duplicate manual mock found" warning
  See:
    - https://jestjs.io/docs/configuration#modulepathignorepatterns-arraystring
    - https://github.com/facebook/jest/issues/6801#issuecomment-712951064
    - #448
   */
  modulePathIgnorePatterns: ["<rootDir>/lib"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
};
