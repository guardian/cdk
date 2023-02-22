import { Match, Template } from "aws-cdk-lib/assertions";
import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";
import { AccessScope } from "../../constants";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuNodeApp, GuPlayApp, GuPlayWorkerApp } from "./framework";

describe("Framework level EC2 app patterns", () => {
  test("GuNodeApp exposes port 3000", function () {
    const stack = simpleGuStackForTesting();
    new GuNodeApp(stack, {
      app: "NodeApp",
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
    const stack = simpleGuStackForTesting();
    new GuPlayApp(stack, {
      app: "PlayApp",
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

  it("GuPlayWorkerApp has no internal or external access", function () {
    const stack = simpleGuStackForTesting();
    new GuPlayWorkerApp(stack, {
      app: "PlayApp",
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

    Template.fromStack(stack).hasResource("AWS::EC2::SecurityGroup", {
      "Properties": {
        "GroupDescription": "Allow restricted ingress from CIDR ranges",
        "SecurityGroupIngress": Match.absent(),
      },
      "Type": "AWS::EC2::SecurityGroup"
    });
  });
});
