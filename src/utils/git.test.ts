import { gitRepoFullName } from "./git";

describe("gitRepoFullName", () => {
  it("should parse an HTTPS URL", () => {
    expect(gitRepoFullName("https://github.com/guardian/cdk")).toBe("guardian/cdk");
  });

  it("should parse an HTTPS URL with .git suffix", () => {
    expect(gitRepoFullName("https://github.com/guardian/cdk.git")).toBe("guardian/cdk");
  });

  it("should parse an SSH shorthand URL", () => {
    expect(gitRepoFullName("git@github.com:guardian/cdk.git")).toBe("guardian/cdk");
  });

  it("should parse an SSH shorthand URL without .git suffix", () => {
    expect(gitRepoFullName("git@github.com:guardian/cdk")).toBe("guardian/cdk");
  });

  it("should parse an ssh:// URL", () => {
    expect(gitRepoFullName("ssh://git@github.com/guardian/cdk.git")).toBe("guardian/cdk");
  });

  it("should handle repo names with dots and hyphens", () => {
    expect(gitRepoFullName("https://github.com/guardian/my-dotfiles.v2")).toBe("guardian/my-dotfiles.v2");
  });

  it("should throw for an unparseable URL", () => {
    expect(() => gitRepoFullName("not-a-url")).toThrow("Unable to parse git URL");
  });
});
