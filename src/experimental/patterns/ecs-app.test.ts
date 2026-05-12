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
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should be able to co-exist in the same stack as a GuEc2App if we're sharing load balancer components", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const { loadBalancer, listener, targetGroup } = new GuEc2App(stack, {
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
    new GuEcsAppExperimental(stack, {
      app: "test-gu",
      imageIdentifier: "sha256:12345",
      repositoryName: "my-repository",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      migrationProps: {
        listener,
        loadBalancer,
        targetGroup,
        weightForEcsTargetGroup: 0,
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should be able to split traffic between EC2 and ECS target groups", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const { loadBalancer, listener, targetGroup } = new GuEc2App(stack, {
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
    new GuEcsAppExperimental(stack, {
      app: "test-gu",
      imageIdentifier: "sha256:12345",
      repositoryName: "my-repository",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      migrationProps: {
        listener,
        loadBalancer,
        targetGroup,
        weightForEcsTargetGroup: 500,
      },
    });
    // FIXME - use a specific assertion
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
