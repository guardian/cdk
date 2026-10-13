import { suite, test } from "node:test";
import { App, Duration } from "aws-cdk-lib";
import { CfnScalingPolicy, UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";
import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";
import { Schedule } from "aws-cdk-lib/aws-events";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { AccessScope } from "../constants";
import type { GuStackProps } from "../constructs/core";
import { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import { GuEc2AppExperimental } from "../experimental/patterns/ec2-app";
import { GuEc2App, GuNodeApp, GuPlayApp, GuScheduledLambda } from "../patterns";
import { UnknownRiffRaffProjectName } from "./types";
import { RiffRaffYamlFile, validateRiffRaffYamlDirectory } from "./index";

suite("The RiffRaffYamlFile class", () => {
  test("Should support deploying different GuStacks to multiple AWS accounts (aka Riff-Raff stacks), and regions", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class ServiceRunningInDeployTools extends GuStack {}
    class AnotherServiceRunningInDeployTools extends GuStack {}
    class ServiceRunningInSecurity extends GuStack {}

    new ServiceRunningInDeployTools(app, "App-CODE-deploy", {
      env: {
        region: "eu-west-1",
      },
      stack: "deploy",
      stage: "CODE",
    });
    new AnotherServiceRunningInDeployTools(app, "AnotherApp-CODE-deploy", {
      env: {
        region: "us-east-2",
      },
      stack: "deploy",
      stage: "CODE",
    });
    new ServiceRunningInSecurity(app, "App-CODE-security", {
      env: {
        region: "eu-west-1",
      },
      stack: "security",
      stage: "CODE",
    });

    const actual = new RiffRaffYamlFile(app).toYAML();

    t.assert.snapshot(actual);
  });

  test("Should support deploying different GuStacks to multiple AWS accounts (aka Riff-Raff stacks)", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class ServiceRunningInDeployTools extends GuStack {}
    class AnotherServiceRunningInDeployTools extends GuStack {}
    class ServiceRunningInSecurity extends GuStack {}
    const region = {
      env: {
        region: "eu-west-1",
      },
    };

    new ServiceRunningInDeployTools(app, "App-CODE-deploy", {
      ...region,
      stack: "deploy",
      stage: "CODE",
    });
    new AnotherServiceRunningInDeployTools(app, "AnotherApp-CODE-deploy", {
      ...region,
      stack: "deploy",
      stage: "CODE",
    });
    new ServiceRunningInSecurity(app, "App-CODE-security", {
      ...region,
      stack: "security",
      stage: "CODE",
    });

    const actual = new RiffRaffYamlFile(app).toYAML();
    t.assert.snapshot(actual);
  });

  test("Should add a cloud-formation deployment", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-PROD-deploy", { stack: "deploy", stage: "PROD", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();

    t.assert.snapshot(actual);
  });

  test("Should add a cloud-formation deployment with multiple stages", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-PROD-deploy", { stack: "deploy", stage: "PROD", env: { region: "eu-west-1" } });
    new MyApplicationStack(app, "App-CODE-deploy", { stack: "deploy", stage: "CODE", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();

    t.assert.snapshot(actual);
  });

  test("Should add a cloud-formation deployment with multiple stages and regions", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-PROD-deploy-eu-west-1", {
      stack: "deploy",
      stage: "PROD",
      env: { region: "eu-west-1" },
    });
    new MyApplicationStack(app, "App-CODE-deploy-eu-west-1", {
      stack: "deploy",
      stage: "CODE",
      env: { region: "eu-west-1" },
    });

    new MyApplicationStack(app, "App-PROD-deploy-us-east-1", {
      stack: "deploy",
      stage: "PROD",
      env: { region: "us-east-1" },
    });
    new MyApplicationStack(app, "App-CODE-deploy-us-east-1", {
      stack: "deploy",
      stage: "CODE",
      env: { region: "us-east-1" },
    });

    const actual = new RiffRaffYamlFile(app).toYAML();

    t.assert.snapshot(actual);
  });

  test("Should add aws-lambda deployments", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class MyApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        new GuScheduledLambda(this, "test", {
          app: "my-lambda",
          runtime: Runtime.NODEJS_16_X,
          fileName: "my-lambda-artifact.zip",
          handler: "handler.main",
          rules: [{ schedule: Schedule.rate(Duration.hours(1)) }],
          monitoringConfiguration: { noMonitoring: true },
          timeout: Duration.minutes(1),
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "TEST", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();
    t.assert.snapshot(actual);
  });

  test("Should omit default prefix values in lambda deployments if `withoutFilePrefix` is `true`", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class MyApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        new GuScheduledLambda(this, "test", {
          app: "my-lambda",
          runtime: Runtime.NODEJS_16_X,
          fileName: "my-lambda-artifact.zip",
          handler: "handler.main",
          rules: [{ schedule: Schedule.rate(Duration.hours(1)) }],
          monitoringConfiguration: { noMonitoring: true },
          timeout: Duration.minutes(1),
          withoutFilePrefix: true,
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "TEST", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();

    t.assert.snapshot(actual);
  });

  test("Should not create an uploadLambda step when withoutArtifactUpload is true", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class MyApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        new GuLambdaFunction(this, "test", {
          app: "my-lambda",
          withoutArtifactUpload: true,
          runtime: Runtime.NODEJS_16_X,
          fileName: "my-lambda-artifact.zip",
          handler: "handler.main",
          timeout: Duration.minutes(1),
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "TEST", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();
    t.assert.snapshot(actual);
  });

  test("Should drop the updateLambda action if the Lambda uses aliases/versions", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class MyApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        new GuScheduledLambda(this, "test", {
          enableVersioning: true, // This is the important prop
          app: "my-lambda",
          runtime: Runtime.NODEJS_16_X,
          fileName: "my-lambda-artifact.zip",
          handler: "handler.main",
          rules: [{ schedule: Schedule.rate(Duration.hours(1)) }],
          monitoringConfiguration: { noMonitoring: true },
          timeout: Duration.minutes(1),
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "TEST", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();
    t.assert.snapshot(actual);
  });

  test("Should add autoscaling deployments", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class MyApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        const appName = "my-app";

        new GuEc2App(this, {
          app: appName,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
          access: { scope: AccessScope.PUBLIC },
          userData: {
            distributable: {
              fileName: `${appName}.deb`,
              executionStatement: `dpkg -i /${appName}/${appName}.deb`,
            },
          },
          certificateProps: {
            domainName: "rip.gu.com",
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          scaling: {
            minimumInstances: 1,
          },
          applicationPort: 9000,
          imageRecipe: "arm64-bionic-java11-deploy-infrastructure",
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "TEST", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();
    t.assert.snapshot(actual);
  });

  test("Should add all deployment types in within a stack", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class MyApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        new GuScheduledLambda(this, "test", {
          app: "my-lambda-app",
          runtime: Runtime.NODEJS_16_X,
          fileName: "my-lambda-app.zip",
          handler: "handler.main",
          rules: [{ schedule: Schedule.rate(Duration.hours(1)) }],
          monitoringConfiguration: { noMonitoring: true },
          timeout: Duration.minutes(1),
        });

        new GuEc2App(this, {
          app: "my-ec2-app",
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
          access: { scope: AccessScope.PUBLIC },
          userData: {
            distributable: {
              fileName: `my-ec2-app.deb`,
              executionStatement: `dpkg -i /my-ec2-app/my-ec2-app.deb`,
            },
          },
          certificateProps: {
            domainName: "rip.gu.com",
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          scaling: {
            minimumInstances: 1,
          },
          applicationPort: 9000,
          imageRecipe: "arm64-bionic-java11-deploy-infrastructure",
        });
      }
    }

    new MyApplicationStack(app, "test-stack-eu-CODE", { stack: "test", stage: "CODE", env: { region: "eu-west-1" } });
    new MyApplicationStack(app, "test-stack-us-CODE", { stack: "test", stage: "CODE", env: { region: "us-east-1" } });
    new MyApplicationStack(app, "test-stack-eu-PROD", { stack: "test", stage: "PROD", env: { region: "eu-west-1" } });
    new MyApplicationStack(app, "test-stack-us-PROD", { stack: "test", stage: "PROD", env: { region: "us-east-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();
    t.assert.snapshot(actual);
  });

  test("Should support multiple ASGs using a variety of AMIs recipes", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class MyApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        new GuPlayApp(this, {
          app: "my-api",
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
          access: { scope: AccessScope.PUBLIC },
          userData: {
            distributable: {
              fileName: `my-api.deb`,
              executionStatement: `dpkg -i /my-api/my-api.deb`,
            },
          },
          certificateProps: {
            domainName: "api.devx.gutools.co.uk",
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          scaling: {
            minimumInstances: 1,
          },
          imageRecipe: {
            Recipe: "arm64-bionic-java11-deploy-infrastructure",
            Encrypted: false,
          },
        });

        new GuNodeApp(this, {
          app: "my-data-collector",
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
          access: { scope: AccessScope.PUBLIC },
          userData: {
            distributable: {
              fileName: `my-data-collector.deb`,
              executionStatement: `dpkg -i /my-data-collector/my-data-collector.deb`,
            },
          },
          certificateProps: {
            domainName: "data-collector.devx.gutools.co.uk",
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          scaling: {
            minimumInstances: 1,
          },
          imageRecipe: {
            Recipe: "arm64-bionic-node18-deploy-infrastructure",
            Encrypted: true,
          },
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "CODE", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();
    t.assert.snapshot(actual);
  });
  test("Should support overriding AmigoStage", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class MyApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        new GuPlayApp(this, {
          app: "my-api",
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
          access: { scope: AccessScope.PUBLIC },
          userData: {
            distributable: {
              fileName: `my-api.deb`,
              executionStatement: `dpkg -i /my-api/my-api.deb`,
            },
          },
          certificateProps: {
            domainName: "api.devx.gutools.co.uk",
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          scaling: {
            minimumInstances: 1,
          },
          imageRecipe: {
            Recipe: "arm64-bionic-java11-deploy-infrastructure",
            AmigoStage: "CODE",
            Encrypted: true,
          },
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "CODE", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();
    t.assert.snapshot(actual);
  });

  test("Should support user-added Riff-Raff deployments", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });
    class MyApplicationStack extends GuStack {}
    const { stack, region } = new MyApplicationStack(app, "App-PROD-deploy", {
      stack: "deploy",
      stage: "PROD",
      env: { region: "eu-west-1" },
    });

    const riffraff = new RiffRaffYamlFile(app);

    riffraff.configuration.get(UnknownRiffRaffProjectName)?.deployments.set("upload-my-static-files", {
      app: "my-static-site",
      contentDirectory: "my-static-site",
      parameters: {
        bucketSsmKey: `/${stack}/my-static-site-origin`,
        publicReadAcl: false,
        cacheControl: "public, max-age=315360000, immutable",
      },
      regions: new Set([region]),
      stacks: new Set([stack]),
      type: "aws-s3",
    });

    const actual = riffraff.toYAML();

    t.assert.snapshot(actual);
  });

  test("Should support cloudformation stacks that depend on other cloudformation stacks", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class DatabaseStack extends GuStack {}
    class ApplicationStack extends GuStack {}

    const databaseCode = new DatabaseStack(app, "Database-CODE", {
      env: {
        region: "eu-west-1",
      },
      stack: "deploy",
      stage: "CODE",
    });

    const databaseProd = new DatabaseStack(app, "Database-PROD", {
      env: {
        region: "eu-west-1",
      },
      stack: "deploy",
      stage: "PROD",
    });

    const appCode = new ApplicationStack(app, "App-CODE", {
      env: {
        region: "eu-west-1",
      },
      stack: "deploy",
      stage: "CODE",
    });

    const appProd = new ApplicationStack(app, "App-PROD", {
      env: {
        region: "eu-west-1",
      },
      stack: "deploy",
      stage: "PROD",
    });

    appCode.addDependency(databaseCode);
    appProd.addDependency(databaseProd);

    const actual = new RiffRaffYamlFile(app).toYAML();

    t.assert.snapshot(actual);
  });

  test("Should only upload artifacts for an ASG with an update policy", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class MyApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        const appName = "my-app";

        new GuEc2App(this, {
          app: appName,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
          access: { scope: AccessScope.PUBLIC },
          userData: {
            distributable: {
              fileName: `${appName}.deb`,
              executionStatement: `dpkg -i /${appName}/${appName}.deb`,
            },
          },
          certificateProps: {
            domainName: "rip.gu.com",
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          scaling: {
            minimumInstances: 1,
          },
          applicationPort: 9000,
          imageRecipe: "arm64-bionic-java11-deploy-infrastructure",
          updatePolicy: UpdatePolicy.rollingUpdate(),
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "TEST", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();

    t.assert.snapshot(actual);
  });

  test("Should only upload artifacts for a GuEc2AppExperimental", (t) => {
    const app = new App({ outdir: "/tmp/cdk.out" });

    class MyApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(app: App, id: string, props: GuStackProps) {
        super(app, id, props);

        const appName = "my-app";

        new GuEc2AppExperimental(this, {
          app: appName,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
          access: { scope: AccessScope.PUBLIC },
          userData: {
            distributable: {
              fileName: `${appName}.deb`,
              executionStatement: `dpkg -i /${appName}/${appName}.deb`,
            },
          },
          certificateProps: {
            domainName: "rip.gu.com",
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          scaling: {
            minimumInstances: 1,
          },
          applicationPort: 9000,
          imageRecipe: "arm64-bionic-java11-deploy-infrastructure",
          buildIdentifier: "TEST",
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "TEST", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFile(app).toYAML();

    t.assert.snapshot(actual);
  });

  test("Calculation of the minInstancesInServiceParameters deployment parameter", () => {
    interface ApplicationStackProps extends GuStackProps {
      app: string;
      withScalingPolicy: boolean;
    }

    class ApplicationStack extends GuStack {
      // eslint-disable-next-line custom-rules/valid-constructors -- unit testing
      constructor(scope: App, id: string, props: ApplicationStackProps) {
        super(scope, id, props);

        const { app, withScalingPolicy } = props;

        const { autoScalingGroup } = new GuEc2AppExperimental(this, {
          app,
          instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
          access: { scope: AccessScope.PUBLIC },
          userData: {
            distributable: {
              fileName: `${app}.deb`,
              executionStatement: `dpkg -i /${app}/${app}.deb`,
            },
          },
          certificateProps: {
            domainName: "rip.gu.com",
          },
          monitoringConfiguration: { noMonitoring: true },
          instanceMetricGranularity: "5Minute",
          scaling: {
            minimumInstances: 1,
          },
          applicationPort: 9000,
          imageRecipe: "arm64-bionic-java11-deploy-infrastructure",
          buildIdentifier: "TEST",
        });

        if (withScalingPolicy) {
          new CfnScalingPolicy(autoScalingGroup, "ScaleOut", {
            autoScalingGroupName: autoScalingGroup.autoScalingGroupName,
            policyType: "SimpleScaling",
            adjustmentType: "ChangeInCapacity",
            scalingAdjustment: 1,
          });
        }
      }
    }

    test("should be included when there is a scaling policy", (t) => {
      const app = new App({ outdir: "/tmp/cdk.out" });

      new ApplicationStack(app, "test-stack", {
        stack: "test",
        stage: "TEST",
        app: "my-app",
        withScalingPolicy: true,
        env: { region: "eu-west-1" },
      });

      // Ensure the Aspects are invoked (see https://github.com/aws/aws-cdk/issues/29047)...
      app.synth();

      // ...so that the CFN Parameters are added to the template, to then be processed by the `RiffRaffYamlFile`
      const actual = new RiffRaffYamlFile(app).toYAML();

      t.assert.snapshot(actual);
    });

    test("should not be included when there is no scaling policy", (t) => {
      const app = new App({ outdir: "/tmp/cdk.out" });

      new ApplicationStack(app, "test-stack", {
        stack: "test",
        stage: "TEST",
        app: "my-app",
        withScalingPolicy: false,
        env: { region: "eu-west-1" },
      });

      // Ensure the Aspects are invoked (see https://github.com/aws/aws-cdk/issues/29047)...
      app.synth();

      // ...so that the CFN Parameters are added to the template, to then be processed by the `RiffRaffYamlFile`
      const actual = new RiffRaffYamlFile(app).toYAML();

      t.assert.snapshot(actual);
    });

    test("should be included when there is a scaling policy (multiple stages)", (t) => {
      const app = new App({ outdir: "/tmp/cdk.out" });

      new ApplicationStack(app, "my-stack-CODE", {
        stack: "test",
        stage: "CODE",
        app: "my-app",
        withScalingPolicy: true,
        env: { region: "eu-west-1" },
      });

      new ApplicationStack(app, "my-stack-PROD", {
        stack: "test",
        stage: "PROD",
        app: "my-app",
        withScalingPolicy: true,
        env: { region: "eu-west-1" },
      });

      // Ensure the Aspects are invoked (see https://github.com/aws/aws-cdk/issues/29047)...
      app.synth();

      // ...so that the CFN Parameters are added to the template, to then be processed by the `RiffRaffYamlFile`
      const actual = new RiffRaffYamlFile(app).toYAML();

      t.assert.snapshot(actual);
    });

    test("should be included when there is a scaling policy (different stacks)", (t) => {
      const app = new App({ outdir: "/tmp/cdk.out" });

      class MyApiStack extends ApplicationStack {}
      class MyFrontendStack extends ApplicationStack {}

      new MyApiStack(app, "my-api-stack", {
        stack: "test",
        stage: "PROD",
        app: "my-api-stack",
        withScalingPolicy: true,
        env: { region: "eu-west-1" },
      });

      new MyFrontendStack(app, "my-frontend-stack", {
        stack: "test",
        stage: "PROD",
        app: "my-frontend-stack",
        withScalingPolicy: true,
        env: { region: "eu-west-1" },
      });

      // Ensure the Aspects are invoked (see https://github.com/aws/aws-cdk/issues/29047)...
      app.synth();

      // ...so that the CFN Parameters are added to the template, to then be processed by the `RiffRaffYamlFile`
      const actual = new RiffRaffYamlFile(app).toYAML();

      t.assert.snapshot(actual);
    });

    test("should only be included when there is a scaling policy (multiple stages)", (t) => {
      const app = new App({ outdir: "/tmp/cdk.out" });

      new ApplicationStack(app, "my-app-CODE", {
        stack: "test",
        stage: "CODE",
        app: "my-app",
        withScalingPolicy: false, // no need to horizontally scale CODE
        env: { region: "eu-west-1" },
      });

      new ApplicationStack(app, "my-app-PROD", {
        stack: "test",
        stage: "PROD",
        app: "my-app",
        withScalingPolicy: true,
        env: { region: "eu-west-1" },
      });

      // Ensure the Aspects are invoked (see https://github.com/aws/aws-cdk/issues/29047)...
      app.synth();

      // ...so that the CFN Parameters are added to the template, to then be processed by the `RiffRaffYamlFile`
      const actual = new RiffRaffYamlFile(app).toYAML();

      t.assert.snapshot(actual);
    });

    test("should only be included when there is a scaling policy (different stacks)", (t) => {
      const app = new App({ outdir: "/tmp/cdk.out" });

      class MyApiStack extends ApplicationStack {}
      class MyFrontendStack extends ApplicationStack {}

      new MyApiStack(app, "my-api-stack", {
        stack: "test",
        stage: "PROD",
        app: "my-api-stack",
        withScalingPolicy: false,
        env: { region: "eu-west-1" },
      });

      new MyFrontendStack(app, "my-frontend-stack", {
        stack: "test",
        stage: "PROD",
        app: "my-frontend-stack",
        withScalingPolicy: true,
        env: { region: "eu-west-1" },
      });

      // Ensure the Aspects are invoked (see https://github.com/aws/aws-cdk/issues/29047)...
      app.synth();

      // ...so that the CFN Parameters are added to the template, to then be processed by the `RiffRaffYamlFile`
      const actual = new RiffRaffYamlFile(app).toYAML();

      t.assert.snapshot(actual);
    });
  });

  suite("The validation checks performed during initialisation", () => {
    test("should throw if there is an unresolved region", (t) => {
      const app = new App();
      class MyApplicationStack extends GuStack {}
      new MyApplicationStack(app, "App-CODE-deploy", { stack: "deploy", stage: "CODE" });

      t.assert.throws(() => {
        new RiffRaffYamlFile(app);
      }, new Error("Unable to produce a working riff-raff.yaml file; all stacks must have an explicit region set"));
    });

    test("should throw when the CODE database definition is missing", (t) => {
      const app = new App();

      class MyApplicationStack extends GuStack {}
      class MyDatabaseStack extends GuStack {}

      new MyApplicationStack(app, "App-CODE-deploy", {
        env: {
          region: "eu-west-1",
        },
        stack: "deploy",
        stage: "CODE",
      });
      new MyApplicationStack(app, "App-PROD-deploy", {
        env: {
          region: "eu-west-1",
        },
        stack: "deploy",
        stage: "PROD",
      });

      new MyDatabaseStack(app, "Database-PROD-deploy", {
        env: {
          region: "eu-west-1",
        },
        stack: "deploy",
        stage: "PROD",
      });

      t.assert.throws(() => {
        new RiffRaffYamlFile(app);
      }, new Error("Unable to produce a working riff-raff.yaml file; missing 1 definitions"));
    });

    test("should throw when the stack of media-service has no CODE stage", (t) => {
      const app = new App();

      class MyApplicationStack extends GuStack {}

      new MyApplicationStack(app, "App-CODE-deploy", {
        env: {
          region: "eu-west-1",
        },
        stack: "deploy",
        stage: "CODE",
      });
      new MyApplicationStack(app, "App-PROD-deploy", {
        env: {
          region: "eu-west-1",
        },
        stack: "deploy",
        stage: "PROD",
      });

      new MyApplicationStack(app, "App-PROD-media-service", {
        env: {
          region: "eu-west-1",
        },
        stack: "media-service",
        stage: "PROD",
      });

      t.assert.throws(() => {
        new RiffRaffYamlFile(app);
      }, new Error("Unable to produce a working riff-raff.yaml file; missing 1 definitions"));
    });

    test("should throw when region definitions are missing (no PROD eu-west-1, no CODE us-east-1)", (t) => {
      const app = new App();

      class MyApplicationStack extends GuStack {}

      new MyApplicationStack(app, "App-CODE-deploy", {
        env: {
          region: "eu-west-1",
        },
        stack: "deploy",
        stage: "CODE",
      });
      new MyApplicationStack(app, "App-PROD-deploy", {
        env: {
          region: "us-east-1",
        },
        stack: "deploy",
        stage: "PROD",
      });

      t.assert.throws(() => {
        new RiffRaffYamlFile(app);
      }, new Error("Unable to produce a working riff-raff.yaml file; missing 2 definitions"));
    });

    test("should generate multiple configurations", (t) => {
      const app = new App({ outdir: "/tmp/cdk.out" });

      class MyCoreInfraStack extends GuStack {}
      class MyApplicationStack extends GuStack {}

      new MyCoreInfraStack(app, "MyCoreInfra", {
        stack: "deploy",
        stage: "INFRA",
        env: { region: "eu-west-1" },
        riffRaffProjectName: "deploy::core-infra",
      });

      new MyApplicationStack(app, "MyApp-CODE", {
        stack: "deploy",
        stage: "CODE",
        env: { region: "eu-west-1" },
        riffRaffProjectName: "deploy::my-app",
      });

      new MyApplicationStack(app, "MyApp-PROD", {
        stack: "deploy",
        stage: "PROD",
        env: { region: "eu-west-1" },
        riffRaffProjectName: "deploy::my-app",
      });

      const riffraff = new RiffRaffYamlFile(app);

      t.assert.deepEqual(Array.from(riffraff.configuration.keys()), ["deploy::core-infra", "deploy::my-app"]);

      t.assert.snapshot(riffraff.toYAML("deploy::core-infra"));
      t.assert.snapshot(riffraff.toYAML("deploy::my-app"));
    });

    test("should throw when generating multiple configurations and there are missing definitions", (t) => {
      const app = new App({ outdir: "/tmp/cdk.out" });

      class MyCoreInfraStack extends GuStack {}
      class MyApplicationStack extends GuStack {}
      class MyDatabaseStack extends GuStack {}

      new MyCoreInfraStack(app, "MyCoreInfra", {
        stack: "deploy",
        stage: "INFRA",
        env: { region: "eu-west-1" },
        riffRaffProjectName: "deploy::core-infra",
      });

      new MyApplicationStack(app, "MyApp-CODE", {
        stack: "deploy",
        stage: "CODE",
        env: { region: "eu-west-1" },
        riffRaffProjectName: "deploy::my-app",
      });

      new MyApplicationStack(app, "MyApp-PROD", {
        stack: "deploy",
        stage: "PROD",
        env: { region: "eu-west-1" },
        riffRaffProjectName: "deploy::my-app",
      });

      new MyDatabaseStack(app, "MyDatabase-PROD", {
        stack: "deploy",
        stage: "PROD",
        env: { region: "eu-west-1" },
        riffRaffProjectName: "deploy::my-app",
      });

      t.assert.throws(() => {
        new RiffRaffYamlFile(app);
      }, new Error("Unable to produce a working riff-raff.yaml file; missing 1 definitions"));
    });
  });
});

suite("The validateRiffRaffYamlDirectory function", () => {
  test("accepts a child directory", (t) => {
    const actual = validateRiffRaffYamlDirectory("/tmp/cdk.out", "playground::my-project");
    t.assert.equal(actual, "/tmp/cdk.out/playground::my-project");
  });

  test("accepts a grand-child directory", (t) => {
    const actual = validateRiffRaffYamlDirectory("/tmp/cdk.out", "playground/my-project");
    t.assert.equal(actual, "/tmp/cdk.out/playground/my-project");
  });

  test("accepts the empty string", (t) => {
    const actual = validateRiffRaffYamlDirectory("/tmp/cdk.out", "");
    t.assert.equal(actual, "/tmp/cdk.out");
  });

  test("accepts a .. directory name", (t) => {
    const actual = validateRiffRaffYamlDirectory("/tmp/cdk.out", "..final");
    t.assert.equal(actual, "/tmp/cdk.out/..final");
  });

  test("rejects a parent directory", (t) => {
    t.assert.throws(() => {
      validateRiffRaffYamlDirectory("/tmp/cdk.out", "../playground::my-project");
    }, new Error("Directory traversal detected: '../playground::my-project' would create a directory outside of /tmp/cdk.out (riffRaffProjectName=../playground::my-project, resolvedPath='/tmp/playground::my-project', resolvedBase='/tmp/cdk.out')"));
  });

  test("accepts an ancestor directory", (t) => {
    const actual = validateRiffRaffYamlDirectory("/tmp/cdk.out", "child/../final");
    t.assert.equal(actual, "/tmp/cdk.out/final");
  });

  test("rejects a multi-ancestor directory", (t) => {
    t.assert.throws(() => {
      validateRiffRaffYamlDirectory("/tmp/cdk.out", "child/../somewhere/../../final");
    }, new Error("Directory traversal detected: 'child/../somewhere/../../final' would create a directory outside of /tmp/cdk.out (riffRaffProjectName=child/../somewhere/../../final, resolvedPath='/tmp/final', resolvedBase='/tmp/cdk.out')"));
  });
});
