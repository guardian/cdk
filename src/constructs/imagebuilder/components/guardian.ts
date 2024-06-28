import type { GuStack } from "../../core";
import { GuComponent } from "../component";

export const DevX = {
  NGINX: (scope: GuStack) => ({
    component: new GuComponent(scope, `NginxInstallStep`, {
      platform: "Linux",
      version: "1.0.0",
      name: `${scope.stack}-${scope.stage}-${scope.app}-nginx`,
      phases: [
        {
          name: "build",
          steps: [
            {
              name: "InstallNginx",
              action: "ExecuteBash",
              inputs: {
                commands: ["apt-get install nginx -y"],
              },
            },
          ],
        },
      ],
    }),
  }),
};
