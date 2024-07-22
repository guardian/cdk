import { Template } from "aws-cdk-lib/assertions";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuComponentJavaCorretto } from "./components";
import { GuImagePipeline } from "./pipeline";
import { GuImageRecipe } from "./recipe";

describe("The Ami class", () => {
  it("should create a GuImagePipeline with minimal config", () => {
    const stack = simpleGuStackForTesting();

    new GuImagePipeline(stack, "ami", {
      imageRecipe: new GuImageRecipe(stack, "recipe", {
        components: [
          new GuComponentJavaCorretto(stack, {
            version: 17,
          }),
        ],
      }),
    });

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
