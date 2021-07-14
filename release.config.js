module.exports = {
  branches: [
    // commits to the `main` branch will be released to npm as normal
    { name: "main" },

    // commits to the `beta` branch will be released to `@guardian/cdk@beta`
    { name: "beta", prerelease: true },
  ],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    "@semantic-release/github",
  ],
};
