module.exports = {
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  setupFilesAfterEnv: ["./jest.setup.js"],

  // ignore these files as they're used to demonstrate custom lint rules and Jest flags unused declarations
  testPathIgnorePatterns: ["<rootDir>/tools/eslint/rules/*.test.ts"],

  /*
  Ignore `lib` to prevent a 'duplicate manual mock found" warning
  See:
    - https://jestjs.io/docs/configuration#modulepathignorepatterns-arraystring
    - https://github.com/facebook/jest/issues/6801#issuecomment-712951064
    - #448
   */
  modulePathIgnorePatterns: ["<rootDir>/lib"],
};
