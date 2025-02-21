import { App, Stack } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import { UniqueLambdaAppRegionStackAspect } from "./unique-lambda-app-region-stack";

const testLambdaProps = { handler: "index.handler", fileName: "test", runtime: Runtime.NODEJS_20_X };
describe("UniqueAppRegionStackAspect", () => {
  let stack: GuStack;
  let aspect: UniqueLambdaAppRegionStackAspect;

  beforeEach(() => {
    stack = new GuStack(new App(), "TestStack", { stack: "test", stage: "CODE" });
    aspect = new UniqueLambdaAppRegionStackAspect(stack);
  });

  it("should allow unique app combinations", () => {
    const lambda1 = new GuLambdaFunction(stack, "Lambda1", { ...testLambdaProps, app: "app1" });
    const lambda2 = new GuLambdaFunction(stack, "Lambda2", { ...testLambdaProps, app: "app2" });

    expect(() => {
      aspect.visit(lambda1);
      aspect.visit(lambda2);
    }).not.toThrow();
  });

  it("should throw error for duplicate app combinations", () => {
    const lambda1 = new GuLambdaFunction(stack, "Lambda1", { ...testLambdaProps, app: "app1" });
    const lambda2 = new GuLambdaFunction(stack, "Lambda2", { ...testLambdaProps, app: "app1" });

    expect(() => {
      aspect.visit(lambda1);
      aspect.visit(lambda2);
    }).toThrow("GuLambdaFunction must have a unique combination of app, region and stack. Found duplicate: app1");
  });

  it("should ignore non-GuLambdaFunction constructs", () => {
    const nonLambdaConstruct = new Stack();

    expect(() => {
      aspect.visit(nonLambdaConstruct);
    }).not.toThrow();
  });
});
