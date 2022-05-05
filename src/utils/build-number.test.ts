import { getBuildNumber } from "./build-number";

describe("build number retrieval", () => {
  beforeEach(() => {
    // don't let tests pollute each other
    delete process.env.BUILD_NUMBER;
    delete process.env.GITHUB_RUN_NUMBER;
  });

  it("should be set to 'unknown' when env vars are not set", () => {
    expect(getBuildNumber()).toEqual("unknown");
  });

  it("can be set from BUILD_NUMBER", () => {
    process.env.BUILD_NUMBER = "1";
    expect(getBuildNumber()).toEqual("1");
  });

  it("can be set from GITHUB_RUN_NUMBER", () => {
    process.env.GITHUB_RUN_NUMBER = "2";
    expect(getBuildNumber()).toEqual("2");
  });

  it("prefers BUILD_NUMBER when both BUILD_NUMBER and GITHUB_RUN_NUMBER are set", () => {
    process.env.BUILD_NUMBER = "1";
    process.env.GITHUB_RUN_NUMBER = "2";
    expect(getBuildNumber()).toEqual("1");
  });
});
