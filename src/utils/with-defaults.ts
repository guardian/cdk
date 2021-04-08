import type { GuStack } from "../constructs/core";
import type { AppIdentity } from "../constructs/core/identity";

export type WithDefault<T> = {
  DEFAULT: T;
};

export type WithDefaultByGuStack<T> = {
  DEFAULT: (scope: GuStack) => T;
};

export type WithDefaultByGuStackAndAppIdentity<T> = {
  DEFAULT: (scope: GuStack, props: AppIdentity) => T;
};
