import { Template } from "aws-cdk-lib/assertions";
import { InstanceClass, InstanceSize, InstanceType, UserData } from "aws-cdk-lib/aws-ec2";
import { AccessScope } from "../../constants";
import { GuEc2App } from "../../patterns";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuEcsAppExperimental } from "./ecs-app";

describe("the GuEcsApp pattern", function () {
  it("should produce a functional ECS app with minimal arguments", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuEcsAppExperimental(stack, {
      app: "test-gu",
      imageIdentifier: "sha256:12345",
      repositoryName: "my-repository",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      createLoadBalancerAndListener: true,
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should be able to co-exist in the same stack as a GuEc2App if we're skipping load balancer creation", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuEcsAppExperimental(stack, {
      app: "test-gu",
      imageIdentifier: "sha256:12345",
      repositoryName: "my-repository",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      createLoadBalancerAndListener: false,
    });
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  // FIXME - add specific test assertion rather than using a snapshot
  it("should omit the LB and listener if requested", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuEcsAppExperimental(stack, {
      app: "test-gu",
      imageIdentifier: "sha256:12345",
      repositoryName: "my-repository",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      createLoadBalancerAndListener: false,
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  // FIXME - add specific test assertion rather than using a snapshot
  it("should be able to pass its target group to the GuEc2App to receive a share of the traffic", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const ecsApp = new GuEcsAppExperimental(stack, {
      app: "test-gu",
      imageIdentifier: "sha256:12345",
      repositoryName: "my-repository",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      createLoadBalancerAndListener: false,
    });
    new GuEc2App(stack, {
      applicationPort: 3000,
      app: "test-gu",
      access: { scope: AccessScope.PUBLIC },
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: { noMonitoring: true },
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
      ecsTargetConfig: { targetGroup: ecsApp.targetGroup, weight: 500 },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
