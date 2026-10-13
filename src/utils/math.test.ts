import { strictEqual } from "node:assert";
import { test } from "node:test";
import { sum } from "./math";

test("should sum a list of numbers", () => {
  const numbers = [1, 2, 3, 4, 0];
  strictEqual(sum(numbers), 10);
});
