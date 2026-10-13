import { deepEqual } from "node:assert";
import { suite, test } from "node:test";
import { groupBy } from "./array";

suite("groupBy", () => {
  test("should group an array of objects on a specific field", () => {
    interface Food {
      name: string;
      kind: "fruit" | "vegetable";
    }

    const data: Food[] = [
      { name: "apple", kind: "fruit" },
      { name: "banana", kind: "fruit" },
      { name: "carrot", kind: "vegetable" },
      { name: "daikon", kind: "vegetable" },
    ];

    const actual = groupBy(data, (_) => _.kind);

    deepEqual(actual, {
      fruit: [
        { name: "apple", kind: "fruit" },
        { name: "banana", kind: "fruit" },
      ],
      vegetable: [
        { name: "carrot", kind: "vegetable" },
        { name: "daikon", kind: "vegetable" },
      ],
    });
  });

  test("should support providing a default value when a field can be undefined", () => {
    interface Food {
      name: string;
      kind: "fruit" | "vegetable";
      variety?: string;
    }

    const data: Food[] = [
      { name: "apple", kind: "fruit", variety: "gala" },
      { name: "banana", kind: "fruit" },
      { name: "carrot", kind: "vegetable" },
      { name: "daikon", kind: "vegetable" },
    ];

    const actual = groupBy(data, (_) => _.variety ?? "unknown");

    deepEqual(actual, {
      gala: [{ name: "apple", kind: "fruit", variety: "gala" }],
      unknown: [
        { name: "banana", kind: "fruit" },
        { name: "carrot", kind: "vegetable" },
        { name: "daikon", kind: "vegetable" },
      ],
    });
  });
});
