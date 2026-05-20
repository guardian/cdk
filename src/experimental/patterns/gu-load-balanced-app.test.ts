import { Template } from "aws-cdk-lib/assertions";
import { InstanceClass, InstanceSize, InstanceType, UserData } from "aws-cdk-lib/aws-ec2";
import { AccessScope } from "../../constants";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuLoadBalancedAppExperimental } from "./gu-load-balanced-app";

describe("the GuLoadBalancedAppExperimental pattern should support all existing EC2 functionality", function () {
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
});
describe("the GuLoadBalancedAppExperimental pattern should support new ECS and hybrid functionality", function () {
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
    Template.fromStack(stack).hasResourceProperties("AWS::ElasticLoadBalancingV2::Listener", {
      DefaultActions: [
        {
          ForwardConfig: {
            TargetGroups: [
              {
                TargetGroupArn: {
                  Ref: "TargetGroupTestgu1F401467",
                },
                Weight: 499,
              },
              {
                TargetGroupArn: {
                  Ref: "EcsTargetGroupTestguFCB7574C",
                },
                Weight: 500,
              },
            ],
          },
        },
      ],
    });
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
  // Because this has not been tested thoroughly yet
  it("should throw an error if there is an ECS backend and the Google Auth feature is being used", function () {
    const stack = simpleGuStackForTesting({ env: { region: "eu-west-1" } });
    const domain = "domain-name-for-your-application.example";
    expect(
      () =>
        new GuLoadBalancedAppExperimental(stack, {
          monitoringConfiguration: { noMonitoring: true },
          applicationPort: 3000,
          access: { scope: AccessScope.PUBLIC },
          app: "test-gu",
          certificateProps: {
            domainName: domain,
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
            ec2: 899,
            ecs: 100,
          },
          googleAuth: {
            enabled: true,
            domain,
          },
        }),
    ).toThrow("Using Google Auth with ECS is currently unsupported");
  });
});
