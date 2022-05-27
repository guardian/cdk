import { Template } from "aws-cdk-lib/assertions";
import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";
import { AccessScope } from "../../constants";
import { simpleTestingResources } from "../../utils/test";
import { GuNodeApp, GuPlayApp } from "./framework";

describe("Framework level EC2 app patterns", () => {
  test("GuNodeApp exposes port 3000", function () {
    const { stack, app } = simpleTestingResources({ appName: "NodeApp" });
    new GuNodeApp(app, {
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: {
        domainName: "code-guardian.com",
        hostedZoneId: "id123",
      },
      scaling: {
        minimumInstances: 1,
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      FromPort: 3000,
    });
  });

  it("GuPlayApp exposes port 9000", function () {
    const { stack, app } = simpleTestingResources({ appName: "PlayApp" });
    new GuPlayApp(app, {
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData: "#!/bin/dev foobarbaz",
      certificateProps: {
        domainName: "code-guardian.com",
        hostedZoneId: "id123",
      },
      scaling: {
        minimumInstances: 1,
      },
    });

    Template.fromStack(stack).hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      FromPort: 9000,
    });
  });
});
