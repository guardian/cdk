import { App, Duration } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import type { CfnAutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { CfnScalingPolicy } from "aws-cdk-lib/aws-autoscaling";
import { InstanceClass, InstanceSize, InstanceType, UserData } from "aws-cdk-lib/aws-ec2";
import { CloudFormationStackArtifact } from "aws-cdk-lib/cx-api";
import { AccessScope } from "../../constants";
import { GuUserData } from "../../constructs/autoscaling";
import { GuStack } from "../../constructs/core";
import { simpleGuStackForTesting } from "../../utils/test";
import type { GuEc2AppExperimentalProps } from "./ec2-app";
import { GuEc2AppExperimental, RollingUpdateDurations } from "./ec2-app";

/**
 * `Aspects` appear to run only at synth time.
 * This means we must synth the stack to see the results of the `Aspect`.
 *
 * @see https://github.com/aws/aws-cdk/issues/29047
 *
 * @param stack the stack to synthesise
 */
function getTemplateAfterAspectInvocation(stack: GuStack): Template {
  const app = App.of(stack);

  if (!app) {
    throw new Error(`Unable to locate the enclosing App from GuStack ${stack.node.id}`);
  }

  const { artifacts } = app.synth();
  const cfnStack = artifacts.find((_): _ is CloudFormationStackArtifact => _ instanceof CloudFormationStackArtifact);

  if (!cfnStack) {
    throw new Error("Unable to locate a CloudFormationStackArtifact");
  }

  return Template.fromJSON(cfnStack.template as Record<string, unknown>);
}

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
      buildIdentifier: "TEST",
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
        ResourceSignal: {
          Count: 5,
        },
      },
    });
  });

  it("should have a PauseTime higher than the ASG healthcheck grace period", () => {
    const stack = simpleGuStackForTesting();
    const { autoScalingGroup } = new GuEc2AppExperimental(stack, initialProps(stack));

    const tenMinutes = Duration.minutes(10);
    const tenMinutesPlusBuffer = tenMinutes.plus(RollingUpdateDurations.buffer);

    const cfnAsg = autoScalingGroup.node.defaultChild as CfnAutoScalingGroup;
    cfnAsg.healthCheckGracePeriod = tenMinutes.toSeconds();

    const template = getTemplateAfterAspectInvocation(stack);

    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        HealthCheckGracePeriod: tenMinutes.toSeconds(),
      },
      CreationPolicy: {
        ResourceSignal: {
          Timeout: tenMinutesPlusBuffer.toIsoString(),
        },
      },
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          PauseTime: tenMinutesPlusBuffer.toIsoString(),
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

  it("should only adjust properties of a horizontally scaling service", () => {
    const stack = simpleGuStackForTesting();

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

    const template = getTemplateAfterAspectInvocation(stack);

    // The scaling ASG should NOT have `DesiredCapacity` set, and `MinInstancesInService` set via a CFN Parameter
    const parameterName = `MinInstancesInServiceFor${scalingApp.replaceAll("-", "")}`;
    template.hasParameter(parameterName, {
      Type: "Number",
      Default: 5,
      MaxValue: 9, // (min * 2) - 1
    });
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        DesiredCapacity: Match.absent(),
        Tags: Match.arrayWith([{ Key: "App", Value: scalingApp, PropagateAtLaunch: true }]),
      },
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          MinInstancesInService: {
            Ref: parameterName,
          },
        },
      },
    });

    // The static ASG SHOULD have `DesiredCapacity` and `MinInstancesInService` explicitly
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      Properties: {
        DesiredCapacity: "1",
        Tags: Match.arrayWith([{ Key: "App", Value: staticApp, PropagateAtLaunch: true }]),
      },
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          MinInstancesInService: 1,
        },
      },
    });
  });

  it("should add a single CFN Parameter per ASG regardless of how many scaling policies are attached to it", () => {
    const stack = simpleGuStackForTesting();

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

    new CfnScalingPolicy(autoScalingGroup, "ScaleOut", {
      autoScalingGroupName: autoScalingGroup.autoScalingGroupName,
      policyType: "SimpleScaling",
      adjustmentType: "ChangeInCapacity",
      scalingAdjustment: 1,
    });

    new CfnScalingPolicy(autoScalingGroup, "ScaleIn", {
      autoScalingGroupName: autoScalingGroup.autoScalingGroupName,
      policyType: "SimpleScaling",
      adjustmentType: "ChangeInCapacity",
      scalingAdjustment: -1,
    });

    const template = getTemplateAfterAspectInvocation(stack);

    const parameterName = `MinInstancesInServiceFor${scalingApp.replaceAll("-", "")}`;

    template.hasParameter(parameterName, {
      Type: "Number",
      Default: 5,
      MaxValue: 9, // (min * 2) - 1
    });

    template.resourceCountIs("AWS::AutoScaling::AutoScalingGroup", 1);
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          MinInstancesInService: {
            Ref: parameterName,
          },
        },
      },
    });

    template.resourceCountIs("AWS::AutoScaling::ScalingPolicy", 3);
  });

  it("should throw an error when a scaling policy is not created with a GuAutoScalingGroup scope", () => {
    const cdkApp = new App();
    const stack = new GuStack(cdkApp, "test", {
      stack: "test-stack",
      stage: "TEST",
    });

    const { autoScalingGroup } = new GuEc2AppExperimental(stack, initialProps(stack));

    /**
     * Should be created like this to avoid the error:
     *
     * @example
     * ```ts
     * declare const autoScalingGroup: GuAutoScalingGroup;
     * new CfnScalingPolicy(autoScalingGroup, "ScaleOut", { ... });
     * ```
     */
    new CfnScalingPolicy(stack, "ScaleOut", {
      autoScalingGroupName: autoScalingGroup.autoScalingGroupName,
      policyType: "SimpleScaling",
      adjustmentType: "ChangeInCapacity",
      scalingAdjustment: 1,
    });

    expect(() => {
      cdkApp.synth();
    }).toThrowError(
      "Failed to detect the autoscaling group relating to the scaling policy on path test/ScaleOut. Was it created in the scope of a GuAutoScalingGroup?",
    );
  });
});