import { Template } from "aws-cdk-lib/assertions";
import { InstanceClass, InstanceSize, InstanceType, UserData } from "aws-cdk-lib/aws-ec2";
import { CfnListener, CfnLoadBalancer, CfnTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { AccessScope } from "../../constants";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuLoadBalancedAppExperimental, MigrationHelperExperimental } from "./gu-load-balanced-app";

describe("the GuLoadBalancedAppExperimental pattern", function () {
  it("should produce a functional EC2 app with minimal arguments", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      monitoringConfiguration: { noMonitoring: true },
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app: "test-gu",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
  it("should produce a functional ECS app with minimal arguments", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      monitoringConfiguration: { noMonitoring: true },
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app: "test-gu",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ecsProps: {
        cpu: 1024,
        memoryLimitMiB: 2048,
        scaling: { minimumTasks: 3, maximumTasks: 6 },
        imageIdentifier: "sha256:12345",
        repositoryName: "my-repository",
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
  it("work with the migration helper", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const app = "test-gu";
    const ecsPattern = new GuLoadBalancedAppExperimental(stack, {
      monitoringConfiguration: { noMonitoring: true },
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app,
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ecsProps: {
        cpu: 1024,
        memoryLimitMiB: 2048,
        scaling: { minimumTasks: 3, maximumTasks: 6 },
        imageIdentifier: "sha256:12345",
        repositoryName: "my-repository",
      },
    });
    const currentLoadBalancer = new CfnLoadBalancer(stack, "LoadBalancer", { securityGroups: ["my-lb-sg"] });
    const currentListener = new CfnListener(stack, "Listener", { loadBalancerArn: "test", defaultActions: [] });
    const ec2TargetGroup = new CfnTargetGroup(stack, "Ec2TargetGroup", {});
    new MigrationHelperExperimental(stack, {
      app,
      currentLoadBalancer,
      currentListener,
      ec2TargetGroup,
      ecsPattern,
      ec2Weight: 499,
      ecsWeight: 500,
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
  it("should be capable of splitting traffic between EC2 and ECS target groups", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    new GuLoadBalancedAppExperimental(stack, {
      monitoringConfiguration: { noMonitoring: true },
      applicationPort: 3000,
      access: { scope: AccessScope.PUBLIC },
      app: "test-gu",
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      ec2Props: {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
        instanceMetricGranularity: "5Minute",
        userData: UserData.forLinux(),
        scaling: {
          minimumInstances: 1,
        },
      },
      ecsProps: {
        cpu: 1024,
        memoryLimitMiB: 2048,
        scaling: { minimumTasks: 3, maximumTasks: 6 },
        imageIdentifier: "sha256:12345",
        repositoryName: "my-repository",
      },
      targetGroupWeights: {
        ec2: 499,
        ecs: 500,
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
  it("should throw an error if EC2 and ECS are both present but no weights are provided", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          monitoringConfiguration: { noMonitoring: true },
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app: "test-gu",
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
          ec2Props: {
            instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
            instanceMetricGranularity: "5Minute",
            userData: UserData.forLinux(),
            scaling: {
              minimumInstances: 1,
            },
          },
          ecsProps: {
            cpu: 1024,
            memoryLimitMiB: 2048,
            scaling: { minimumTasks: 3, maximumTasks: 6 },
            imageIdentifier: "sha256:12345",
            repositoryName: "my-repository",
          },
        }),
    ).toThrow("EC2 and ECS are both enabled but no target group weights were provided");
  });
  it("should throw an error if illegal weights are provided", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          monitoringConfiguration: { noMonitoring: true },
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app: "test-gu",
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
          ec2Props: {
            instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
            instanceMetricGranularity: "5Minute",
            userData: UserData.forLinux(),
            scaling: {
              minimumInstances: 1,
            },
          },
          ecsProps: {
            cpu: 1024,
            memoryLimitMiB: 2048,
            scaling: { minimumTasks: 3, maximumTasks: 6 },
            imageIdentifier: "sha256:12345",
            repositoryName: "my-repository",
          },
          targetGroupWeights: {
            ec2: 999,
            ecs: 1,
          },
        }),
    ).toThrow("Combined target group weights for EC2 and ECS must be equal to 999");
  });
  it("should throw an error if EC2 and ECS props are both omitted", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          monitoringConfiguration: { noMonitoring: true },
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app: "test-gu",
          certificateProps: {
            domainName: "domain-name-for-your-application.example",
          },
        }),
    ).toThrow("At least one of 'ec2Props' or 'ecsProps' must be specified");
  });
});
