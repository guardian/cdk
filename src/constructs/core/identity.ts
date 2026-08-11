import { Tags } from "aws-cdk-lib";
import type { IConstruct } from "constructs";

export interface StackStageIdentity {
  stack: string;
  stage: string;
}

export interface AppIdentity {
  app: string;
}

export interface Identity extends StackStageIdentity, AppIdentity {}

export const AppIdentity = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user defined type guard
  isAppIdentity(props: any): props is AppIdentity {
    return props ? "app" in props : false;
  },

  toAlphanumericTitleCase(appIdentity: AppIdentity) {
    const titleCaseApp = appIdentity.app.charAt(0).toUpperCase() + appIdentity.app.slice(1);
    // CloudFormation Logical Ids must be alphanumeric, so remove any non-alphanumeric characters: https://stackoverflow.com/a/20864946
    return titleCaseApp.replace(/[\W_]+/g, "");
  },

  addAppToStringEnd(appIdentity: AppIdentity, text: string): string {
    return [text, AppIdentity.toAlphanumericTitleCase(appIdentity)].join("");
  },

  addAppToStringStart(appIdentity: AppIdentity, text: string): string {
    return [AppIdentity.toAlphanumericTitleCase(appIdentity), text].join("");
  },

  taggedConstruct<T extends IConstruct>(appIdentity: AppIdentity, construct: T): T {
    Tags.of(construct).add("App", appIdentity.app);
    return construct;
  },
};
