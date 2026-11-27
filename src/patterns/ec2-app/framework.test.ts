import { Duration } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { InstanceClass, InstanceSize, InstanceType, UserData } from "aws-cdk-lib/aws-ec2";
import { AccessScope } from "../../constants";
import { simpleGuStackForTesting } from "../../utils/test";
import type { GuPlayAppProps, PlaySecretRotationProps } from "./framework";
import { GuNodeApp, GuPlayApp, GuPlayWorkerApp } from "./framework";

const parameterName = "/existing/play/secret";
const playSecretRotation: PlaySecretRotationProps = {
  parameterName,
  interval: Duration.hours(6),
  usageDelay: Duration.minutes(3),
  overlapDuration: Duration.hours(2),
};

function playProps(overrides: Partial<GuPlayAppProps> = {}): GuPlayAppProps {
  return {
    app: "PlayApp",
    access: { scope: AccessScope.RESTRICTED, cidrRanges: [] },
    instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
    monitoringConfiguration: { noMonitoring: true },
    instanceMetricGranularity: "5Minute",
    userData: UserData.forLinux(),
    certificateProps: { domainName: "code-guardian.com", hostedZoneId: "id123" },
    scaling: { minimumInstances: 2, maximumInstances: 4 },
    ...overrides,
  };
}

describe("Framework level EC2 app patterns", () => {
  test("GuNodeApp exposes port 3000", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuNodeApp(stack, {
      app: "NodeApp",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
        hostedZoneId: "id123",
      },
      scaling: {
        minimumInstances: 1,
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      FromPort: 3000,
    });
    expect(template.toJSON()).toMatchSnapshot();
  });

  it("GuPlayApp exposes port 9000", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuPlayApp(stack, {
      app: "PlayApp",
      access: { scope: AccessScope.RESTRICTED, cidrRanges: [] },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
        hostedZoneId: "id123",
      },
      scaling: {
        minimumInstances: 1,
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::EC2::SecurityGroupIngress", {
      FromPort: 9000,
    });
    expect(template.toJSON()).toMatchSnapshot();
  });

  it("GuPlayWorkerApp has no internal or external access", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuPlayWorkerApp(stack, {
      app: "PlayApp",
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "code-guardian.com",
        hostedZoneId: "id123",
      },
      scaling: {
        minimumInstances: 1,
      },
    });

    const template = Template.fromStack(stack);
    template.hasResource("AWS::EC2::SecurityGroup", {
      Properties: {
        GroupDescription: "Allow restricted ingress from CIDR ranges",
        SecurityGroupIngress: Match.absent(),
      },
      Type: "AWS::EC2::SecurityGroup",
    });
    expect(template.toJSON()).toMatchSnapshot();
  });

  test.each([{ Pattern: GuPlayApp }, { Pattern: GuPlayWorkerApp }])(
    "$Pattern.name schedules one writer for a multi-instance fleet",
    ({ Pattern }) => {
      const stack = simpleGuStackForTesting({ env: { account: "123456789012", region: "eu-west-1" } });
      new Pattern(stack, playProps({ playSecretRotation }));
      const template = Template.fromStack(stack);
      const parameterArn = {
        "Fn::Join": [
          "",
          ["arn:", { Ref: "AWS::Partition" }, ":ssm:eu-west-1:123456789012:parameter/existing/play/secret"],
        ],
      };
      const readerRole = template.getResourceId("AWS::IAM::Role", {
        Properties: {
          AssumeRolePolicyDocument: {
            Statement: Match.arrayWith([Match.objectLike({ Principal: { Service: "ec2.amazonaws.com" } })]),
          },
        },
      });
      template.resourceCountIs("AWS::Events::Rule", 1);
      template.hasResourceProperties("AWS::IAM::Policy", {
        Roles: [{ Ref: readerRole }],
        PolicyDocument: {
          Statement: [{ Action: "ssm:GetParameters", Effect: "Allow", Resource: parameterArn }],
        },
      });
      expect(template.toJSON()).toMatchSnapshot();
    },
  );
});
