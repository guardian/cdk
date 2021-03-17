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
};
