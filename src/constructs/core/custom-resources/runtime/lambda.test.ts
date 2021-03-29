/*
 * You can't specify the file extension (eg .ts) of the file to import,
 * and lambda.js exists as a dummy file, so we'd always import that over lambda.ts (the actual code to be tested) if
 * we imported `lambda`
 * lambda.symlink is a symlink to lambda.ts, so we can test it without importing lambda.js
 * */
import { flatten } from "./lambda.symlink";

describe("The flatten function", function () {
  it("should flatten nested objects into one", function () {
    expect(flatten({ foo: { bar: "baz" } })).toEqual({ "foo.bar": "baz" });
  });

  it("should flatten infinitely nested objects into one", function () {
    expect(flatten({ foo: { bar: { baz: { blah: "foo" } } } })).toEqual({ "foo.bar.baz.blah": "foo" });
  });
});
