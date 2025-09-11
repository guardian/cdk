import { toKebabCase, toPascalCase } from "./string";

describe("toPascalCase", () => {
  it("should convert a standard string to PascalCase", () => {
    const input = "hello there";
    const expected = "HelloThere";
    const actual = toPascalCase(input);
    expect(actual).toEqual(expected);
  });

  it("should convert a kebab-string to PascalCase", () => {
    const input = "hello-there";
    const expected = "HelloThere";
    const actual = toPascalCase(input);
    expect(actual).toEqual(expected);
  });

  it("should convert a camelCase string to PascalCase", () => {
    const input = "helloThere";
    const expected = "HelloThere";
    const actual = toPascalCase(input);
    expect(actual).toEqual(expected);
  });

  it("should convert a snake_string to PascalCase", () => {
    const input = "hello_there";
    const expected = "HelloThere";
    const actual = toPascalCase(input);
    expect(actual).toEqual(expected);
  });

  it("should live a string already in PascalCase unchanged", () => {
    const input = "HelloThere";
    const expected = "HelloThere";
    const actual = toPascalCase(input);
    expect(actual).toEqual(expected);
  });
});

describe("toKebabCase", () => {
  it("should convert a standard string to kebab-case", () => {
    const input = "hello there";
    const expected = "hello-there";
    const actual = toKebabCase(input);
    expect(actual).toEqual(expected);
  });

  it("should convert a PascalCase string to kebab-case", () => {
    const input = "HelloThere";
    const expected = "hello-there";
    const actual = toKebabCase(input);
    expect(actual).toEqual(expected);
  });

  it("should convert a camelCase string to kebab-case", () => {
    const input = "helloThere";
    const expected = "hello-there";
    const actual = toKebabCase(input);
    expect(actual).toEqual(expected);
  });

  it("should convert a snake_string to kebab-case", () => {
    const input = "hello_there";
    const expected = "hello-there";
    const actual = toKebabCase(input);
    expect(actual).toEqual(expected);
  });


  it("should leave a kebab-case string unchanged", () => {
    const input = "hello-there";
    const expected = "hello-there";
    const actual = toKebabCase(input);
    expect(actual).toEqual(expected);
  });
});
