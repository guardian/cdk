import { deepStrictEqual } from "node:assert";
import { suite, test } from "node:test";
import { getUserPoolDomainPrefix } from "./cognito";

suite("getUserPoolDomainPrefix", () => {
  test("should use a full length hash where there is space", () => {
    const shortPrefix = "hello";
    const domainPrefix = getUserPoolDomainPrefix(shortPrefix);

    deepStrictEqual(domainPrefix.length, 32 + shortPrefix.length + 1);
  });

  test("should include the full prefix where there is space for a 5 character hash", () => {
    const prefix55 = new Array(55 + 1).join("#");
    const domainPrefix = getUserPoolDomainPrefix(prefix55);

    deepStrictEqual(domainPrefix.includes(prefix55), true);
    deepStrictEqual(domainPrefix.length, 63);
  });

  test("should not include the full prefix where there is not space for a 5 character hash", () => {
    const prefix56 = new Array(58 + 1).join("#");
    const domainPrefix = getUserPoolDomainPrefix(prefix56);

    deepStrictEqual(domainPrefix.includes(prefix56), false);
    deepStrictEqual(domainPrefix.length, 63);
  });

  test("should be 63 characters long even with a very long prefix", () => {
    const prefix = new Array(63 + 1).join("#");
    const domainPrefix = getUserPoolDomainPrefix(prefix);

    deepStrictEqual(domainPrefix.length, 63);
  });
});
