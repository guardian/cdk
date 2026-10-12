import { strictEqual } from "node:assert";
import { suite, test } from "node:test";
import { toKebabCase, toPascalCase } from "./string";

suite("toPascalCase", () => {
  test("should convert a standard string to PascalCase", () => {
    const input = "hello there";
    const expected = "HelloThere";
    const actual = toPascalCase(input);
    strictEqual(actual, expected);
  });

  test("should convert a kebab-string to PascalCase", () => {
    const input = "hello-there";
    const expected = "HelloThere";
    const actual = toPascalCase(input);
    strictEqual(actual, expected);
  });

  test("should convert a camelCase string to PascalCase", () => {
    const input = "helloThere";
    const expected = "HelloThere";
    const actual = toPascalCase(input);
    strictEqual(actual, expected);
  });

  test("should convert a snake_string to PascalCase", () => {
    const input = "hello_there";
    const expected = "HelloThere";
    const actual = toPascalCase(input);
    strictEqual(actual, expected);
  });
});

suite("toKebabCase", () => {
  test("should convert a standard string to kebab-case", () => {
    const input = "hello there";
    const expected = "hello-there";
    const actual = toKebabCase(input);
    strictEqual(actual, expected);
  });

  test("should convert a PascalCase string to kebab-case", () => {
    const input = "HelloThere";
    const expected = "hello-there";
    const actual = toKebabCase(input);
    strictEqual(actual, expected);
  });

  test("should convert a camelCase string to kebab-case", () => {
    const input = "helloThere";
    const expected = "hello-there";
    const actual = toKebabCase(input);
    strictEqual(actual, expected);
  });

  test("should convert a snake_string to kebab-case", () => {
    const input = "hello_there";
    const expected = "hello-there";
    const actual = toKebabCase(input);
    strictEqual(actual, expected);
  });
});
