import { App, Aspects, Duration } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import type { CfnAutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { CfnScalingPolicy } from "aws-cdk-lib/aws-autoscaling";
import { InstanceClass, InstanceSize, InstanceType, UserData } from "aws-cdk-lib/aws-ec2";
import { AccessScope } from "../../constants";
import { GuUserData } from "../../constructs/autoscaling";
import type { GuStackProps } from "../../constructs/core";
import { GuStack } from "../../constructs/core";
import { GuEc2App } from "../../patterns";
import type { GuAsgCapacity } from "../../types";
import { getTemplateAfterAspectInvocation, simpleGuStackForTesting } from "../../utils/test";
import type { GuEc2AppExperimentalProps } from "./ec2-app";
import { GuHorizontallyScalingDeploymentPropertiesExperimental } from "./ec2-app";
import { getAsgRollingUpdateCfnParameterName, GuEc2AppExperimental, RollingUpdateDurations } from "./ec2-app";

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
    instanceMetricGranularity: "5Minute",
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

// TODO test User Data includes a build number
describe("The GuEc2AppExperimental pattern", () => {
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
    const startMarkerPosition = splitUserData.indexOf("# GuEc2AppExperimental Instance Health Check Start");
    const endMarkerPosition = splitUserData.indexOf("# GuEc2AppExperimental Instance Health Check End");

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
    const parameterName = getAsgRollingUpdateCfnParameterName(autoScalingGroup);
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

  it("should add the correct CFN Parameters for more than one EC2 app in the same stack", () => {
    const app = new App();
    const stack = new GuStack(app, "test", {
      stack: "test-stack",
      stage: "TEST",
    });

    const appA = new GuEc2AppExperimental(stack, {
      ...initialProps(stack, "app-a"),
      scaling: { minimumInstances: 3, maximumInstances: 12 },
    });
    appA.autoScalingGroup.scaleOnRequestCount("ScaleOnRequests", {
      targetRequestsPerMinute: 99,
    });

    const appB = new GuEc2AppExperimental(stack, {
      ...initialProps(stack, "app-b"),
      scaling: { minimumInstances: 6, maximumInstances: 24 },
    });
    appB.autoScalingGroup.scaleOnRequestCount("ScaleOnRequests", {
      targetRequestsPerMinute: 100,
    });

    const template = getTemplateAfterAspectInvocation(stack);

    template.hasParameter("MinInstancesInServiceForappa", {
      Type: "Number",
      Default: 3,
      MaxValue: 11,
    });

    template.hasParameter("MinInstancesInServiceForappb", {
      Type: "Number",
      Default: 6,
      MaxValue: 23,
    });
  });

  it("should add the correct CFN Parameters for two separate stacks in the same app", () => {
    const app = new App();

    interface MicroserviceProps extends GuStackProps {
      scaling: GuAsgCapacity;
    }

    class Microservice extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- this is a test
      constructor(scope: App, id: string, props: MicroserviceProps) {
        super(scope, id, {
          ...props,
        });
        const ec2App = new GuEc2AppExperimental(this, {
          ...initialProps(this),
          scaling: props.scaling,
        });
        ec2App.autoScalingGroup.scaleOnRequestCount("ScaleOnRequests", {
          targetRequestsPerMinute: 100,
        });
      }
    }

    const codeStack = new Microservice(app, "CODE", {
      stack: "playground",
      stage: "CODE",
      scaling: { minimumInstances: 1, maximumInstances: 2 },
    });
    const prodStack = new Microservice(app, "PROD", {
      stack: "playground",
      stage: "PROD",
      scaling: { minimumInstances: 3, maximumInstances: 12 },
    });

    const codeTemplate = getTemplateAfterAspectInvocation(codeStack);
    const prodTemplate = getTemplateAfterAspectInvocation(prodStack);

    const parameterName = "MinInstancesInServiceFortestguec2app";

    codeTemplate.hasParameter(parameterName, {
      Type: "Number",
      Default: 1,
      MaxValue: 1,
    });

    prodTemplate.hasParameter(parameterName, {
      Type: "Number",
      Default: 3,
      MaxValue: 11,
    });
  });

  it("should only add the relevant CFN Parameters for different services which share the same App", () => {
    const app = new App();

    interface MicroserviceProps extends GuStackProps {
      appName: string;
    }

    class Microservice extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- this is a test
      constructor(scope: App, id: string, props: MicroserviceProps) {
        super(scope, id, {
          ...props,
        });
        const ec2App = new GuEc2AppExperimental(this, {
          ...initialProps(this, props.appName),
        });
        ec2App.autoScalingGroup.scaleOnRequestCount("ScaleOnRequests", {
          targetRequestsPerMinute: 100,
        });
      }
    }

    const appA = new Microservice(app, "app-a-PROD", { stack: "playground", stage: "PROD", appName: "app-a" });
    const appB = new Microservice(app, "app-b-PROD", { stack: "playground", stage: "PROD", appName: "app-b" });

    const templateA = getTemplateAfterAspectInvocation(appA);
    const templateB = getTemplateAfterAspectInvocation(appB);

    templateA.hasParameter("MinInstancesInServiceForappa", {
      Type: "Number",
      Default: 1,
      MaxValue: 1,
    });

    expect(templateA.findParameters("*")["MinInstancesInServiceForappb"]).toEqual(undefined);

    templateB.hasParameter("MinInstancesInServiceForappb", {
      Type: "Number",
      Default: 1,
      MaxValue: 1,
    });

    expect(templateB.findParameters("*")["MinInstancesInServiceForappa"]).toEqual(undefined);
  });

  it("should add the correct target group attributes if slow start is enabled", () => {
    const stack = simpleGuStackForTesting();
    new GuEc2AppExperimental(stack, { ...initialProps(stack), slowStartDuration: Duration.seconds(44) });
    const template = getTemplateAfterAspectInvocation(stack);
    template.hasResource("AWS::ElasticLoadBalancingV2::TargetGroup", {
      Properties: {
        TargetGroupAttributes: Match.arrayWith([
          { Key: "deregistration_delay.timeout_seconds", Value: "30" },
          { Key: "stickiness.enabled", Value: "false" },
          { Key: "slow_start.duration_seconds", Value: "44" },
        ]),
      },
    });
  });

  it("should update the pause time for the rolling update correctly", () => {
    const stack = simpleGuStackForTesting();
    new GuEc2AppExperimental(stack, { ...initialProps(stack), slowStartDuration: Duration.minutes(1) });
    const template = getTemplateAfterAspectInvocation(stack);
    template.hasResource("AWS::AutoScaling::AutoScalingGroup", {
      UpdatePolicy: {
        AutoScalingRollingUpdate: {
          PauseTime: "PT4M",
        },
      },
    });
  });

  it("should update the script correctly if slow start is enabled", () => {
    const stack = simpleGuStackForTesting();
    const userDataCommand = `echo "Hello there"`;
    const userData = UserData.forLinux();
    userData.addCommands(userDataCommand);

    const { autoScalingGroup } = new GuEc2AppExperimental(stack, {
      ...initialProps(stack),
      slowStartDuration: Duration.seconds(30),
    });

    const renderedUserData = autoScalingGroup.userData.render();
    const splitUserData = renderedUserData.split("\n");
    const totalLines = splitUserData.length;

    const healthCheckMarkerEnd = splitUserData.indexOf("# GuEc2AppExperimental Instance Health Check End");
    const slowStartMarkerStart = splitUserData.indexOf("# GuEc2AppExperimental SlowStart Wait Period Start");
    const slowStartMarkerEnd = splitUserData.indexOf("# GuEc2AppExperimental SlowStart Wait Period End");

    // Health check polling should end just before the slow start pause kicks in
    expect(healthCheckMarkerEnd).toEqual(slowStartMarkerStart - 1);

    // If slow start is enabled, the logic related to this should be the last thing in the user data script.
    expect(slowStartMarkerEnd).toEqual(totalLines - 1);
  });

  it("should throw an error if the slow start value is too low", () => {
    const stack = simpleGuStackForTesting();
    expect(() => {
      new GuEc2AppExperimental(stack, { ...initialProps(stack), slowStartDuration: Duration.seconds(29) });
    }).toThrowError("Slow start duration must be between 30 and 900 seconds");
  });

  it("should throw an error if the slow start value is too high", () => {
    const stack = simpleGuStackForTesting();
    expect(() => {
      new GuEc2AppExperimental(stack, { ...initialProps(stack), slowStartDuration: Duration.seconds(901) });
    }).toThrowError("Slow start duration must be between 30 and 900 seconds");
  });
});

describe("The GuHorizontallyScalingDeploymentPropertiesExperimental construct", () => {
  it("should ignore scaling policies and ASGs from other stacks if it is applied at App level", () => {
    const app = new App();

    interface MicroserviceProps extends GuStackProps {
      appName: string;
    }

    class Microservice extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- this is a test
      constructor(app: App, id: string, props: MicroserviceProps) {
        super(app, id, {
          ...props,
        });
        const ec2App = new GuEc2App(this, {
          ...initialProps(this, props.appName),
        });
        ec2App.autoScalingGroup.scaleOnRequestCount("ScaleOnRequests", {
          targetRequestsPerMinute: 100,
        });
        const cfnAsg = ec2App.autoScalingGroup.node.defaultChild as CfnAutoScalingGroup;
        cfnAsg.cfnOptions.updatePolicy = { autoScalingRollingUpdate: {} };
        Aspects.of(app).add(GuHorizontallyScalingDeploymentPropertiesExperimental.getInstance(this));
      }
    }

    const appA = new Microservice(app, "app-a-PROD", { stack: "playground", stage: "PROD", appName: "app-a" });
    const appB = new Microservice(app, "app-b-PROD", { stack: "playground", stage: "PROD", appName: "app-b" });

    const templateA = getTemplateAfterAspectInvocation(appA);
    const templateB = getTemplateAfterAspectInvocation(appB);

    templateA.hasParameter("MinInstancesInServiceForappa", {
      Type: "Number",
      Default: 1,
      MaxValue: 1,
    });

    expect(templateA.findParameters("*")["MinInstancesInServiceForappb"]).toEqual(undefined);

    templateB.hasParameter("MinInstancesInServiceForappb", {
      Type: "Number",
      Default: 1,
      MaxValue: 1,
    });

    expect(templateB.findParameters("*")["MinInstancesInServiceForappa"]).toEqual(undefined);
  });
});
