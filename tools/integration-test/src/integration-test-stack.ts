import { InstanceClass, InstanceSize, InstanceType } from "@aws-cdk/aws-ec2";
import type { App } from "@aws-cdk/core";
import { GuPlayApp } from "@guardian/cdk";
import { StageForInfrastructure } from "@guardian/cdk/lib//constants";
import { AccessScope } from "@guardian/cdk/lib/constants/access";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuStackForInfrastructure } from "@guardian/cdk/lib/constructs/core";

export class IntegrationTestStack extends GuStackForInfrastructure {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);
    new GuPlayApp(this, {
      app: "testing",
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: {
        [StageForInfrastructure]: {
          domainName: "code-guardian.com",
          hostedZoneId: "id123",
        },
      },
      scaling: {
        [StageForInfrastructure]: { minimumInstances: 1 },
      },
    });
  }
}
