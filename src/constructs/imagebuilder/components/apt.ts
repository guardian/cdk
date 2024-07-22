import type { GuStack } from "../../core";
import { GuComponent } from "../component";

export class GuComponentAptUpdate extends GuComponent {
  constructor(scope: GuStack) {
    const id = `${scope.stack}-${scope.stage}-${scope.app}-apt-update`;

    super(scope, id, {
      name: id,
      platform: "Linux",
      version: "1.0.0",
      phases: [
        {
          name: "build",
          steps: [
            {
              name: "UpdateApt",
              action: "ExecuteBash",
              inputs: {
                commands: ["sudo apt-get update"],
              },
            },
          ],
        },
      ],
    });
  }
}

export type GuComponentAptInstallProps = {
  signingKeysFromUrls?: string[];
  aptRepositories?: Array<{
    type: "deb" | "deb-src";
    url: string;
    distribution?: string;
    component: string;
  }>;
  packages: string[];
};

export class GuComponentAptInstall extends GuComponent {
  constructor(scope: GuStack, props: GuComponentAptInstallProps) {
    const id = `${scope.stack}-${scope.stage}-${scope.app}-apt-install`;

    super(scope, id, {
      name: id,
      platform: "Linux",
      version: "1.0.0",
      phases: [
        {
          name: "build",
          steps: [
            ...(props.signingKeysFromUrls
              ? [
                  {
                    name: "AddAptKeys",
                    action: "ExecuteBash" as const,
                    inputs: {
                      commands: props.signingKeysFromUrls.map((key) => `wget -qO - ${key}| sudo apt-key add -`),
                    },
                  },
                ]
              : []),

            ...(props.aptRepositories
              ? [
                  {
                    name: "AddAptRepositories",
                    action: "ExecuteBash" as const,
                    inputs: {
                      commands: props.aptRepositories.map(
                        (repo) =>
                          `echo "${repo.type} ${repo.url} ${repo.distribution ?? "$(lsb_release -cs)"} ${repo.component}" | sudo tee -a /etc/apt/sources.list`,
                      ),
                    },
                  },
                  {
                    name: "UpdateApt",
                    action: "ExecuteBash" as const,
                    inputs: {
                      commands: ["sudo apt-get update"],
                    },
                  },
                ]
              : []),

            {
              name: "InstallAptPackages",
              action: "ExecuteBash",
              inputs: {
                commands: [`sudo apt-get install -y ${props.packages.join(" ")}`],
              },
            },
          ],
        },
      ],
    });
  }
}
