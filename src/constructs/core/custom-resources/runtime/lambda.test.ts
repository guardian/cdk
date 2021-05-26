import { flatten } from "./lambda";

describe("The flatten function", function () {
  it("should flatten nested objects into one", function () {
    expect(flatten({ foo: { bar: "baz" } })).toEqual({ "foo.bar": "baz" });
  });

  it("should flatten infinitely nested objects into one", function () {
    expect(flatten({ foo: { bar: { baz: { blah: "foo" } } } })).toEqual({ "foo.bar.baz.blah": "foo" });
  });
});
