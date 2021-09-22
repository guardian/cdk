import { sum } from "./math";

describe("sum", () => {
  it("should sum a list of numbers", () => {
    const numbers = [1, 2, 3, 4, 0];
    expect(sum(numbers)).toEqual(10);
  });
});
