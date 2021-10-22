import { Tags } from "@aws-cdk/core";
import type { IConstruct } from "@aws-cdk/core";

export interface StackStageIdentity {
  stack: string;
  stage: string;
}

export interface AppIdentity {
  app: string;
}

export interface Identity extends StackStageIdentity, AppIdentity {}

export const AppIdentity = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types -- user defined type guard
  isAppIdentity(props: any): props is AppIdentity {
    return props ? "app" in props : false;
  },

  suffixText(appIdentity: AppIdentity, text: string): string {
    const titleCaseApp = appIdentity.app.charAt(0).toUpperCase() + appIdentity.app.slice(1);
    // CloudFormation Logical Ids must be alphanumeric, so remove any non-alphanumeric characters: https://stackoverflow.com/a/20864946
    const alphanumericTitleCaseApp = titleCaseApp.replace(/[\W_]+/g, "");
    return `${text}${alphanumericTitleCaseApp}`;
  },
  taggedConstruct<T extends IConstruct>(appIdentity: AppIdentity, construct: T): T {
    Tags.of(construct).add("App", appIdentity.app);
    return construct;
  },
};
