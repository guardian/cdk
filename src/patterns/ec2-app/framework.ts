/*
These classes don't do anything amazing. Yet!
The plan is to sprinkle some framework specific tooling into them.
For example, a Play app should come with the infrastructure for https://github.com/guardian/play-secret-rotation.
 */

import type { GuStack } from "../../constructs/core";
import { GuDomainName } from "../../types";
import type { GuEc2AppProps } from "./base";
import { GuEc2App } from "./base";

type GuEc2FrameworkAppProps = Omit<GuEc2AppProps, "applicationPort"> & { certificateProps: GuDomainName };

/**
 * Creates an instance of [[`GuEc2App`]], with an application port of 9000.
 */
export class GuPlayApp extends GuEc2App {
  static readonly PORT: number = 9000;

  constructor(scope: GuStack, props: GuEc2FrameworkAppProps) {
    super(scope, { ...props, applicationPort: GuPlayApp.PORT });
  }
}

/**
 * Creates an instance of [[`GuEc2App`]], with an application port of 3000.
 */
export class GuNodeApp extends GuEc2App {
  static readonly PORT: number = 3000;

  constructor(scope: GuStack, props: GuEc2FrameworkAppProps) {
    super(scope, { ...props, applicationPort: GuNodeApp.PORT });
  }
}
