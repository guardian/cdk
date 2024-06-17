import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { Ami } from "./ami";
import { Java } from "./components";

describe("The Ami class", () => {
  it("should create a GuImagePipeline with minimal config", () => {
    const stack = simpleGuStackForTesting();

    Ami.from(stack, "ami").withComponent(Java.JDK_17).build();

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should throw if no components are passed", () => {
    const stack = simpleGuStackForTesting();
    expect(() => {
      Ami.from(stack, "ami").build();
    }).toThrowError("ImageBuilder expects recipes to have atleast 1 component.");
  });
});
