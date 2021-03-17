import { AppIdentity } from "./identity";

describe("AppIdentity.suffixText", () => {
  it("should title case the app before suffixing it", () => {
    const actual = AppIdentity.suffixText({ app: "myapp" }, "InstanceType");
    const expected = "InstanceTypeMyapp";
    expect(actual).toEqual(expected);
  });

  it("should work with title case input", () => {
    const actual = AppIdentity.suffixText({ app: "MyApp" }, "InstanceType");
    const expected = "InstanceTypeMyApp";
    expect(actual).toEqual(expected);
  });

  it("should work with uppercase input", () => {
    const actual = AppIdentity.suffixText({ app: "MYAPP" }, "InstanceType");
    const expected = "InstanceTypeMYAPP";
    expect(actual).toEqual(expected);
  });

  it("should handle hyphens", () => {
    const actual = AppIdentity.suffixText({ app: "my-app" }, "InstanceType");
    const expected = "InstanceTypeMy-app";
    expect(actual).toEqual(expected);
  });
});
