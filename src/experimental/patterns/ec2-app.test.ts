import { App, Duration } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { InstanceClass, InstanceSize, InstanceType, UserData } from "aws-cdk-lib/aws-ec2";
import { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";
import { AccessScope } from "../../constants";
import { GuUserData } from "../../constructs/autoscaling";
import { GuStack } from "../../constructs/core";
import { simpleGuStackForTesting } from "../../utils/test";
import type { GuEc2AppExperimentalProps } from "./ec2-app";
import { GuEc2AppExperimental } from "./ec2-app";

// TODO test User Data includes a build number
describe("The GuEc2AppExperimental pattern", () => {
  function initialProps(scope: GuStack, app: string = "test-gu-ec2-app"): GuEc2AppExperimentalProps {
    const buildNumber = 123;

    const { userData } = new GuUserData(scope, {
      app,
      distributable: {
        fileName: `${app}-${buildNumber}.deb`,
        executionStatement: `dpkg -i /${app}/${app}-${buildNumber}.deb`,
      },
    });

    return {
      applicationPort: 9000,
      app,
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      userData,
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
    };
  }

  it("matches the snapshot", () => {
    const stack = simpleGuStackForTesting();
    new GuEc2AppExperimental(stack, initialProps(stack));
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should create an ASG with min, max, and desired capacity set", () => {
    const stack = simpleGuStackForTesting();

    new GuEc2AppExperimental(stack, { ...initialProps(stack), scaling: { minimumInstances: 5 } });

    Template.fromStack(stack).hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        MinSize: "5",
        MaxSize: "10",
        DesiredCapacity: "5",
      },
    });
  });

  it("should create an ASG with a resource signal count that matches the min instances", () => {
    const stack = simpleGuStackForTesting();

    new GuEc2AppExperimental(stack, { ...initialProps(stack), scaling: { minimumInstances: 5 } });

    Template.fromStack(stack).hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        MinSize: "5",
      },
      CreationPolicy: {
        AutoScalingCreationPolicy: {
          MinSuccessfulInstancesPercent: 100,
        },
        ResourceSignal: {
          Count: 5,
          Timeout: "PT5M",
        },
      },
    });
  });

  it("should create an ASG with the maximum resource signal timeout", () => {
    const stack = simpleGuStackForTesting();

    const targetGroupHealthcheckTimeout = Duration.minutes(7);

    new GuEc2AppExperimental(stack, {
      ...initialProps(stack),
      healthcheck: {
        timeout: targetGroupHealthcheckTimeout,
        interval: Duration.seconds(targetGroupHealthcheckTimeout.toSeconds() + 60),
      },
    });

    const template = Template.fromStack(stack);

    // The Target Group times out in 7 minutes.
    template.hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
      HealthCheckTimeoutSeconds: targetGroupHealthcheckTimeout.toSeconds(),
    });

    // The ASG grace period is 2 minutes, which is less than the Target Group.
    // Therefore, the resource signal timeout should be 7 minutes.
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        HealthCheckGracePeriod: 120,
      },
      CreationPolicy: {
        AutoScalingCreationPolicy: {
          MinSuccessfulInstancesPercent: 100,
        },
        ResourceSignal: {
          Count: 1,
          Timeout: targetGroupHealthcheckTimeout.toIsoString(),
        },
      },
    });
  });

  it("should add to the end of the user data", () => {
    const stack = simpleGuStackForTesting();

    const userDataCommand = `echo "Hello there"`;
    const userData = UserData.forLinux();
    userData.addCommands(userDataCommand);

    const { autoScalingGroup } = new GuEc2AppExperimental(stack, { ...initialProps(stack), userData });

    const renderedUserData = autoScalingGroup.userData.render();
    const splitUserData = renderedUserData.split("\n");
    const totalLines = splitUserData.length;

    const appCommandPosition = splitUserData.indexOf(userDataCommand);
    const startMarkerPosition = splitUserData.indexOf("# GuEc2AppExperimental UserData Start");
    const endMarkerPosition = splitUserData.indexOf("# GuEc2AppExperimental UserData End");

    // Application user data should be before the target group healthcheck polling.
    expect(appCommandPosition).toBeLessThan(startMarkerPosition);

    // The target group healthcheck polling should be the last thing in the user data.
    expect(endMarkerPosition).toEqual(totalLines - 1);
  });

  it("should adjust properties of a horizontally scaling service", () => {
    const cdkApp = new App();
    const stack = new GuStack(cdkApp, "test", {
      stack: "test-stack",
      stage: "TEST",
    });

    const scalingApp = "my-scaling-app";
    const { autoScalingGroup } = new GuEc2AppExperimental(stack, {
      ...initialProps(stack, scalingApp),
      scaling: {
        minimumInstances: 5,
      },
    });
    autoScalingGroup.scaleOnRequestCount("ScaleOnRequests", {
      targetRequestsPerMinute: 100,
    });

    /*
    We're ultimately testing an `Aspect`, which appear to run only at synth time.
    As a work-around, synth the `App`, then perform assertions on the resulting template.

    See also: https://github.com/aws/aws-cdk/issues/29047.
     */
    const { artifacts } = cdkApp.synth();
    const cfnStack = artifacts.find((_): _ is CloudFormationStackArtifact => _ instanceof CloudFormationStackArtifact);

    if (!cfnStack) {
      throw new Error("Unable to locate a CloudFormationStackArtifact");
    }

    const template = Template.fromJSON(cfnStack.template as Record<string, unknown>);

    const parameterName = `MinInstancesInServiceFor${scalingApp.replaceAll("-", "")}`;

    template.hasParameter(parameterName, {
      Type: "Number",
      Default: 5,
      MaxValue: 9, // (min * 2) - 1
    });

    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        MinSize: "5",
        MaxSize: "10",
        DesiredCapacity: Match.absent(),
        Tags: Match.arrayWith([{ Key: "App", Value: scalingApp, PropagateAtLaunch: true }]),
      },
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          MaxBatchSize: 10,
          SuspendProcesses: ["AlarmNotification"],
          MinSuccessfulInstancesPercent: 100,
          WaitOnResourceSignals: true,
          PauseTime: "PT5M",
          MinInstancesInService: {
            Ref: parameterName,
          },
        },
      },
    });
  });

  it("should only adjust properties of a horizontally scaling service", () => {
    const cdkApp = new App();
    const stack = new GuStack(cdkApp, "test", {
      stack: "test-stack",
      stage: "TEST",
    });

    const scalingApp = "my-scaling-app";
    const { autoScalingGroup } = new GuEc2AppExperimental(stack, {
      ...initialProps(stack, scalingApp),
      scaling: {
        minimumInstances: 5,
      },
    });
    autoScalingGroup.scaleOnRequestCount("ScaleOnRequests", {
      targetRequestsPerMinute: 100,
    });

    const staticApp = "my-static-app";
    new GuEc2AppExperimental(stack, initialProps(stack, staticApp));

    /*
    We're ultimately testing an `Aspect`, which appear to run only at synth time.
    As a work-around, synth the `App`, then perform assertions on the resulting template.

    See also: https://github.com/aws/aws-cdk/issues/29047.
     */
    const { artifacts } = cdkApp.synth();
    const cfnStack = artifacts.find((_): _ is CloudFormationStackArtifact => _ instanceof CloudFormationStackArtifact);

    if (!cfnStack) {
      throw new Error("Unable to locate a CloudFormationStackArtifact");
    }

    const template = Template.fromJSON(cfnStack.template as Record<string, unknown>);

    /*
    The scaling ASG should:
      - Not have `DesiredCapacity` set
      - Have `MinInstancesInService` set via a CFN Parameter
     */
    const parameterName = `MinInstancesInServiceFor${scalingApp.replaceAll("-", "")}`;
    template.hasParameter(parameterName, {
      Type: "Number",
      Default: 5,
      MaxValue: 9, // (min * 2) - 1
    });
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        MinSize: "5",
        MaxSize: "10",
        DesiredCapacity: Match.absent(),
        Tags: Match.arrayWith([{ Key: "App", Value: scalingApp, PropagateAtLaunch: true }]),
      },
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          MaxBatchSize: 10,
          SuspendProcesses: ["AlarmNotification"],
          MinSuccessfulInstancesPercent: 100,
          WaitOnResourceSignals: true,
          PauseTime: "PT5M",
          MinInstancesInService: {
            Ref: parameterName,
          },
        },
      },
    });

    /*
    The static ASG should:
      - Have `DesiredCapacity` set explicitly
      - Have `MinInstancesInService` set explicitly
     */
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        MinSize: "1",
        MaxSize: "2",
        DesiredCapacity: "1",
        Tags: Match.arrayWith([{ Key: "App", Value: staticApp, PropagateAtLaunch: true }]),
      },
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          MaxBatchSize: 2,
          SuspendProcesses: ["AlarmNotification"],
          MinSuccessfulInstancesPercent: 100,
          WaitOnResourceSignals: true,
          PauseTime: "PT5M",
          MinInstancesInService: 1,
        },
      },
    });
  });
});
