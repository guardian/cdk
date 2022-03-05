import type { Stack } from "aws-cdk-lib";
import type { GuStack } from "../constructs/core";

/**
 * Check if an element exists in a [[`GuStack`]].
 *
 * Note: this explicitly tests presence in the Stack, not the App.
 * This makes it is possible to create multiple Stacks in the same App;
 * the singleton will new unique across the Stacks.
 *
 * ```typescript
 * import { App } from "@aws-cdk/core";
 *
 * class SomeSingletonConstruct { }
 *
 * class MyStack extends GuStack {
 *   constructor() {
 *     // add SomeSingletonConstruct to stack
 *   }
 * }
 *
 * class MyOtherStack extends GuStack {
 *   constructor() {
 *     // add SomeSingletonConstruct to stack
 *   }
 * }
 *
 * const app = new App();
 * const myStack = new MyStack(app, "MyStack", { stack: "deploy" });
 * const myOtherStack = new MyOtherStack(app, "MyOtherStack", { stack: "deploy" });
 * ```
 *
 * @param stack an instance of [[``GuStack``]]
 * @param maybeSingletonInstance the singleton instance
 *
 * @see https://github.com/aws/aws-cdk/blob/0ea4b19afd639541e5f1d7c1783032ee480c307e/packages/%40aws-cdk/core/lib/private/refs.ts#L47-L50
 */
export const isSingletonPresentInStack = (stack: GuStack, maybeSingletonInstance?: { stack: Stack }): boolean => {
  // destructured `maybeSingletonInstance` to support `CfnElement`s (aka parameters) and `Resource`s, which do not share a type
  return maybeSingletonInstance ? maybeSingletonInstance.stack.node === stack.node : false;
};
