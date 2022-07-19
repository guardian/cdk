/*
These classes don't do anything amazing. Yet!
The plan is to sprinkle some framework specific tooling into them.
For example, a Play app should come with the infrastructure for https://github.com/guardian/play-secret-rotation.
 */

import type { GuConstruct } from "../../aspects/metadata";
import type { GuStack } from "../../constructs/core";
import type { GuEc2AppProps } from "./base";
import { GuEc2App } from "./base";

type GuEc2FrameworkAppProps = Omit<GuEc2AppProps, "applicationPort">;

/**
 * Creates an instance of [[`GuEc2App`]], with an application port of 9000.
 */
export class GuPlayApp extends GuEc2App implements GuConstruct {
  static readonly PORT: number = 9000;
  readonly guConstructID = "GuPlayApp";

  constructor(scope: GuStack, props: GuEc2FrameworkAppProps) {
    super(scope, { ...props, applicationPort: GuPlayApp.PORT });
  }
}

/**
 * Creates an instance of [[`GuEc2App`]], with an application port of 3000.
 */
export class GuNodeApp extends GuEc2App implements GuConstruct {
  static readonly PORT: number = 3000;
  readonly guConstructID = "GuNodeApp";

  constructor(scope: GuStack, props: GuEc2FrameworkAppProps) {
    super(scope, { ...props, applicationPort: GuNodeApp.PORT });
  }
}
