import { Duration } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";
import { AccessScope } from "../../constants";
import { GuUserData } from "../../constructs/autoscaling";
import type { GuStack } from "../../constructs/core";
import { simpleGuStackForTesting } from "../../utils/test";
import type { GuEc2AppExperimentalProps } from "./ec2-app";
import { GuEc2AppExperimental } from "./ec2-app";

// TODO test User Data includes a build number
describe("The GuEc2AppExperimental pattern", () => {
  function initialProps(scope: GuStack): GuEc2AppExperimentalProps {
    const app = "test-gu-ec2-app";
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

  it("should create an ASG with an UpdatePolicy and CreationPolicy", () => {
    const stack = simpleGuStackForTesting();

    new GuEc2AppExperimental(stack, initialProps(stack));

    Template.fromStack(stack).hasResource("AWS::AutoScaling::AutoScalingGroup", {
      CreationPolicy: {
        AutoScalingCreationPolicy: {
          MinSuccessfulInstancesPercent: 100,
        },
        ResourceSignal: {
          Count: 1,
          Timeout: "PT5M",
        },
      },
      UpdatePolicy: {
        AutoScalingReplacingUpdate: {
          WillReplace: true,
        },
        AutoScalingScheduledAction: {
          IgnoreUnmodifiedGroupSizeProperties: true,
        },
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
      UpdatePolicy: {
        AutoScalingReplacingUpdate: {
          WillReplace: true,
        },
        AutoScalingScheduledAction: {
          IgnoreUnmodifiedGroupSizeProperties: true,
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
      UpdatePolicy: {
        AutoScalingReplacingUpdate: {
          WillReplace: true,
        },
        AutoScalingScheduledAction: {
          IgnoreUnmodifiedGroupSizeProperties: true,
        },
      },
    });
  });
});
