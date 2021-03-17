import type { IConstruct } from "@aws-cdk/core";
import { Tags } from "@aws-cdk/core";

export interface StackStageIdentity {
  stack: string;
  stage: string;
}

export interface AppIdentity {
  app: string;
}

export interface Identity extends StackStageIdentity, AppIdentity {}

export const AppIdentity = {
  suffixText(appIdentity: AppIdentity, text: string): string {
    const titleCaseApp = appIdentity.app.charAt(0).toUpperCase() + appIdentity.app.slice(1);
    return `${text}${titleCaseApp}`;
  },
  addTag<T extends IConstruct>(appIdentity: AppIdentity, construct: T): T {
    Tags.of(construct).add("App", appIdentity.app);
    return construct;
  },
};
