import type { GuStack } from "../../core";
import { GuComponentAptInstall } from "./apt";

type GuComponentJavaProps = {
  version: 8 | 11 | 17 | 21 | 22;
};

export class GuComponentJavaCorretto extends GuComponentAptInstall {
  constructor(scope: GuStack, props: GuComponentJavaProps) {
    super(scope, {
      packages: [`java-${props.version}-amazon-corretto-jdk`],
      signingKeysFromUrls: ["https://apt.corretto.aws/corretto.key"],
      aptRepositories: [
        {
          type: "deb",
          url: "https://apt.corretto.aws",
          distribution: "stable",
          component: "main",
        },
      ],
    });
  }
}
