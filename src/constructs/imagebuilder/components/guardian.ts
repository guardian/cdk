import type { GuStack } from "../../core";
import { GuComponent } from "../component";

export const DevX = {
  LOGGING: (scope: GuStack, id: string) =>
    new GuComponent(scope, id, {
      platform: "Linux",
      version: "1.0.0",
      name: `${scope.stack}-${scope.stage}-${scope.app}-logging`,
    }),
};
