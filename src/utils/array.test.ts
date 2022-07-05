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
});
