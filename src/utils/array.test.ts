import { groupBy } from "./array";

describe("groupBy", () => {
  it("should group an array of objects on a specific field", () => {
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

    expect(actual).toEqual({
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

  it("should support providing a default value when a field can be undefined", () => {
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

    expect(actual).toEqual({
      gala: [{ name: "apple", kind: "fruit", variety: "gala" }],
      unknown: [
        { name: "banana", kind: "fruit" },
        { name: "carrot", kind: "vegetable" },
        { name: "daikon", kind: "vegetable" },
      ],
    });
  });
});
