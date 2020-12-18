import { Try } from "./try";

class Rectangle {
  private readonly width: number;
  private readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  get area(): number {
    if (this.width <= 0 || this.height <= 0) {
      throw new Error("both width and height must be positive integers");
    }

    return this.width * this.height;
  }
}

const goodRectangle = new Rectangle(2, 2);
const badRectangle = new Rectangle(-1, -1);

describe("Try", () => {
  it("should return a value if it exists", () => {
    const value = new Try<number>(() => goodRectangle.area);
    expect(value.getOrElse(0)).toBe(4);
  });

  it("should return the default value if the value doesn't exist", () => {
    const value = new Try<number>(() => badRectangle.area);
    expect(value.getOrElse(0)).toBe(0);
  });

  it("should set isSuccess to true on the happy path", () => {
    const value = new Try<number>(() => goodRectangle.area);
    expect(value.isSuccess).toBe(true);
  });

  it("should set isSuccess to false on the unhappy path", () => {
    const value = new Try<number>(() => badRectangle.area);
    expect(value.isSuccess).toBe(false);
  });
});
