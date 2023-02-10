import { App, Duration } from "aws-cdk-lib";
import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";
import { Schedule } from "aws-cdk-lib/aws-events";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { AccessScope } from "../../constants";
import type { GuStackProps } from "../../constructs/core";
import { GuStack } from "../../constructs/core";
import { GuEc2App, GuNodeApp, GuPlayApp, GuScheduledLambda } from "../../patterns";
import { RiffRaffYamlFileExperimental } from "./index";

describe("The RiffRaffYamlFileExperimental class", () => {
  it("Should support deploying different GuStacks to multiple AWS accounts (aka Riff-Raff stacks), and regions", () => {
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

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - CODE
      deployments:
        cfn-eu-west-1-deploy-service-running-in-deploy-tools:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - deploy
          app: service-running-in-deploy-tools
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              CODE: App-CODE-deploy.template.json
        cfn-us-east-2-deploy-another-service-running-in-deploy-tools:
          type: cloud-formation
          regions:
            - us-east-2
          stacks:
            - deploy
          app: another-service-running-in-deploy-tools
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              CODE: AnotherApp-CODE-deploy.template.json
        cfn-eu-west-1-security-service-running-in-security:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - security
          app: service-running-in-security
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              CODE: App-CODE-security.template.json
      "
    `);
  });

  it("Should support deploying different GuStacks to multiple AWS accounts (aka Riff-Raff stacks)", () => {
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

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - CODE
      deployments:
        cfn-eu-west-1-deploy-service-running-in-deploy-tools:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - deploy
          app: service-running-in-deploy-tools
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              CODE: App-CODE-deploy.template.json
        cfn-eu-west-1-deploy-another-service-running-in-deploy-tools:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - deploy
          app: another-service-running-in-deploy-tools
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              CODE: AnotherApp-CODE-deploy.template.json
        cfn-eu-west-1-security-service-running-in-security:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - security
          app: service-running-in-security
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              CODE: App-CODE-security.template.json
      "
    `);
  });

  it("Should throw when there are missing stack definitions", () => {
    const app = new App();

    class MyApplicationStack extends GuStack {}
    class MyDatabaseStack extends GuStack {}

    const region = {
      env: {
        region: "eu-west-1",
      },
    };

    new MyApplicationStack(app, "App-CODE-deploy", { ...region, stack: "deploy", stage: "CODE" });
    new MyApplicationStack(app, "App-PROD-media-service", {
      ...region,
      stack: "media-service",
      stage: "PROD",
    });

    new MyApplicationStack(app, "App-PROD-deploy", { ...region, stack: "deploy", stage: "PROD" });
    new MyDatabaseStack(app, "Database-CODE-deploy", { ...region, stack: "deploy", stage: "PROD" });

    expect(() => {
      new RiffRaffYamlFileExperimental(app);
    }).toThrowError("Unable to produce a working riff-raff.yaml file; missing 1 definitions"); // Stack of media-service has no CODE stage
  });

  it("Should throw if there is an unresolved region", () => {
    const app = new App();
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-CODE-deploy", { stack: "deploy", stage: "CODE" });

    expect(() => {
      new RiffRaffYamlFileExperimental(app);
    }).toThrowError("Unable to produce a working riff-raff.yaml file; all stacks must have an explicit region set");
  });

  it("Should add a cloud-formation deployment", () => {
    const app = new App({ outdir: "/tmp/cdk.out" });
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-PROD-deploy", { stack: "deploy", stage: "PROD", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    // Not sure why we have the extra `"` characters...they don't appear in the resulting file on disk...
    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - PROD
      deployments:
        cfn-eu-west-1-deploy-my-application-stack:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - deploy
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              PROD: App-PROD-deploy.template.json
      "
    `);
  });

  it("Should add a cloud-formation deployment with multiple stages", () => {
    const app = new App({ outdir: "/tmp/cdk.out" });
    class MyApplicationStack extends GuStack {}
    new MyApplicationStack(app, "App-PROD-deploy", { stack: "deploy", stage: "PROD", env: { region: "eu-west-1" } });
    new MyApplicationStack(app, "App-CODE-deploy", { stack: "deploy", stage: "CODE", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - PROD
        - CODE
      deployments:
        cfn-eu-west-1-deploy-my-application-stack:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - deploy
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              PROD: App-PROD-deploy.template.json
              CODE: App-CODE-deploy.template.json
      "
    `);
  });

  it("Should add a cloud-formation deployment with multiple stages and regions", () => {
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

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - PROD
        - CODE
      deployments:
        cfn-eu-west-1-deploy-my-application-stack:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - deploy
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              PROD: App-PROD-deploy-eu-west-1.template.json
              CODE: App-CODE-deploy-eu-west-1.template.json
        cfn-us-east-1-deploy-my-application-stack:
          type: cloud-formation
          regions:
            - us-east-1
          stacks:
            - deploy
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              PROD: App-PROD-deploy-us-east-1.template.json
              CODE: App-CODE-deploy-us-east-1.template.json
      "
    `);
  });

  it("Should add aws-lambda deployments", () => {
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

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - TEST
      deployments:
        lambda-upload-eu-west-1-test-my-lambda:
          type: aws-lambda
          stacks:
            - test
          regions:
            - eu-west-1
          app: my-lambda
          contentDirectory: my-lambda
          parameters:
            bucketSsmLookup: true
            lookupByTags: true
            fileName: my-lambda-artifact.zip
          actions:
            - uploadLambda
        cfn-eu-west-1-test-my-application-stack:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              TEST: test-stack.template.json
          dependencies:
            - lambda-upload-eu-west-1-test-my-lambda
        lambda-update-eu-west-1-test-my-lambda:
          type: aws-lambda
          stacks:
            - test
          regions:
            - eu-west-1
          app: my-lambda
          contentDirectory: my-lambda
          parameters:
            bucketSsmLookup: true
            lookupByTags: true
            fileName: my-lambda-artifact.zip
          actions:
            - updateLambda
          dependencies:
            - cfn-eu-west-1-test-my-application-stack
      "
    `);
  });

  it("Should drop the updateLambda action if the Lambda uses aliases/versions", () => {
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

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - TEST
      deployments:
        lambda-upload-eu-west-1-test-my-lambda:
          type: aws-lambda
          stacks:
            - test
          regions:
            - eu-west-1
          app: my-lambda
          contentDirectory: my-lambda
          parameters:
            bucketSsmLookup: true
            lookupByTags: true
            fileName: my-lambda-artifact.zip
          actions:
            - uploadLambda
        cfn-eu-west-1-test-my-application-stack:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              TEST: test-stack.template.json
          dependencies:
            - lambda-upload-eu-west-1-test-my-lambda
      "
    `);
  });

  it("Should add autoscaling deployments", () => {
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
          scaling: {
            minimumInstances: 1,
          },
          applicationPort: 9000,
          imageRecipe: "arm64-bionic-java11-deploy-infrastructure",
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "TEST", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - TEST
      deployments:
        asg-upload-eu-west-1-test-my-app:
          type: autoscaling
          actions:
            - uploadArtifacts
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-app
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          contentDirectory: my-app
        cfn-eu-west-1-test-my-application-stack:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              TEST: test-stack.template.json
            amiParametersToTags:
              AMIMyapp:
                BuiltBy: amigo
                AmigoStage: PROD
                Recipe: arm64-bionic-java11-deploy-infrastructure
          dependencies:
            - asg-upload-eu-west-1-test-my-app
        asg-update-eu-west-1-test-my-app:
          type: autoscaling
          actions:
            - deploy
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-app
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          dependencies:
            - cfn-eu-west-1-test-my-application-stack
          contentDirectory: my-app
      "
    `);
  });

  it("Should add all deployment types in within a stack", () => {
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

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - CODE
        - PROD
      deployments:
        lambda-upload-eu-west-1-test-my-lambda-app:
          type: aws-lambda
          stacks:
            - test
          regions:
            - eu-west-1
          app: my-lambda-app
          contentDirectory: my-lambda-app
          parameters:
            bucketSsmLookup: true
            lookupByTags: true
            fileName: my-lambda-app.zip
          actions:
            - uploadLambda
        asg-upload-eu-west-1-test-my-ec2-app:
          type: autoscaling
          actions:
            - uploadArtifacts
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-ec2-app
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          contentDirectory: my-ec2-app
        cfn-eu-west-1-test-my-application-stack:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              CODE: test-stack-eu-CODE.template.json
              PROD: test-stack-eu-PROD.template.json
            amiParametersToTags:
              AMIMyec2app:
                BuiltBy: amigo
                AmigoStage: PROD
                Recipe: arm64-bionic-java11-deploy-infrastructure
          dependencies:
            - lambda-upload-eu-west-1-test-my-lambda-app
            - asg-upload-eu-west-1-test-my-ec2-app
        lambda-update-eu-west-1-test-my-lambda-app:
          type: aws-lambda
          stacks:
            - test
          regions:
            - eu-west-1
          app: my-lambda-app
          contentDirectory: my-lambda-app
          parameters:
            bucketSsmLookup: true
            lookupByTags: true
            fileName: my-lambda-app.zip
          actions:
            - updateLambda
          dependencies:
            - cfn-eu-west-1-test-my-application-stack
        asg-update-eu-west-1-test-my-ec2-app:
          type: autoscaling
          actions:
            - deploy
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-ec2-app
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          dependencies:
            - cfn-eu-west-1-test-my-application-stack
          contentDirectory: my-ec2-app
        lambda-upload-us-east-1-test-my-lambda-app:
          type: aws-lambda
          stacks:
            - test
          regions:
            - us-east-1
          app: my-lambda-app
          contentDirectory: my-lambda-app
          parameters:
            bucketSsmLookup: true
            lookupByTags: true
            fileName: my-lambda-app.zip
          actions:
            - uploadLambda
        asg-upload-us-east-1-test-my-ec2-app:
          type: autoscaling
          actions:
            - uploadArtifacts
          regions:
            - us-east-1
          stacks:
            - test
          app: my-ec2-app
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          contentDirectory: my-ec2-app
        cfn-us-east-1-test-my-application-stack:
          type: cloud-formation
          regions:
            - us-east-1
          stacks:
            - test
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              CODE: test-stack-us-CODE.template.json
              PROD: test-stack-us-PROD.template.json
            amiParametersToTags:
              AMIMyec2app:
                BuiltBy: amigo
                AmigoStage: PROD
                Recipe: arm64-bionic-java11-deploy-infrastructure
          dependencies:
            - lambda-upload-us-east-1-test-my-lambda-app
            - asg-upload-us-east-1-test-my-ec2-app
        lambda-update-us-east-1-test-my-lambda-app:
          type: aws-lambda
          stacks:
            - test
          regions:
            - us-east-1
          app: my-lambda-app
          contentDirectory: my-lambda-app
          parameters:
            bucketSsmLookup: true
            lookupByTags: true
            fileName: my-lambda-app.zip
          actions:
            - updateLambda
          dependencies:
            - cfn-us-east-1-test-my-application-stack
        asg-update-us-east-1-test-my-ec2-app:
          type: autoscaling
          actions:
            - deploy
          regions:
            - us-east-1
          stacks:
            - test
          app: my-ec2-app
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          dependencies:
            - cfn-us-east-1-test-my-application-stack
          contentDirectory: my-ec2-app
      "
    `);
  });

  it("Should support multiple ASGs using a variety of AMIs recipes", () => {
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
          scaling: {
            minimumInstances: 1,
          },
          imageRecipe: "arm64-bionic-java11-deploy-infrastructure",
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
          scaling: {
            minimumInstances: 1,
          },
          imageRecipe: "arm64-bionic-node18-deploy-infrastructure",
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "CODE", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - CODE
      deployments:
        asg-upload-eu-west-1-test-my-api:
          type: autoscaling
          actions:
            - uploadArtifacts
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-api
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          contentDirectory: my-api
        asg-upload-eu-west-1-test-my-data-collector:
          type: autoscaling
          actions:
            - uploadArtifacts
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-data-collector
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          contentDirectory: my-data-collector
        cfn-eu-west-1-test-my-application-stack:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              CODE: test-stack.template.json
            amiParametersToTags:
              AMIMyapi:
                BuiltBy: amigo
                AmigoStage: PROD
                Recipe: arm64-bionic-java11-deploy-infrastructure
              AMIMydatacollector:
                BuiltBy: amigo
                AmigoStage: PROD
                Recipe: arm64-bionic-node18-deploy-infrastructure
          dependencies:
            - asg-upload-eu-west-1-test-my-api
            - asg-upload-eu-west-1-test-my-data-collector
        asg-update-eu-west-1-test-my-api:
          type: autoscaling
          actions:
            - deploy
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-api
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          dependencies:
            - cfn-eu-west-1-test-my-application-stack
          contentDirectory: my-api
        asg-update-eu-west-1-test-my-data-collector:
          type: autoscaling
          actions:
            - deploy
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-data-collector
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          dependencies:
            - cfn-eu-west-1-test-my-application-stack
          contentDirectory: my-data-collector
      "
    `);
  });
  it("Should support overriding AmigoStage", () => {
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
          scaling: {
            minimumInstances: 1,
          },
          imageRecipe: {
            Recipe: "arm64-bionic-java11-deploy-infrastructure",
            AmigoStage: "CODE",
          },
        });
      }
    }

    new MyApplicationStack(app, "test-stack", { stack: "test", stage: "CODE", env: { region: "eu-west-1" } });

    const actual = new RiffRaffYamlFileExperimental(app).toYAML();

    expect(actual).toMatchInlineSnapshot(`
      "allowedStages:
        - CODE
      deployments:
        asg-upload-eu-west-1-test-my-api:
          type: autoscaling
          actions:
            - uploadArtifacts
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-api
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          contentDirectory: my-api
        cfn-eu-west-1-test-my-application-stack:
          type: cloud-formation
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-application-stack
          contentDirectory: /tmp/cdk.out
          parameters:
            templateStagePaths:
              CODE: test-stack.template.json
            amiParametersToTags:
              AMIMyapi:
                BuiltBy: amigo
                AmigoStage: CODE
                Recipe: arm64-bionic-java11-deploy-infrastructure
          dependencies:
            - asg-upload-eu-west-1-test-my-api
        asg-update-eu-west-1-test-my-api:
          type: autoscaling
          actions:
            - deploy
          regions:
            - eu-west-1
          stacks:
            - test
          app: my-api
          parameters:
            bucketSsmLookup: true
            prefixApp: true
          dependencies:
            - cfn-eu-west-1-test-my-application-stack
          contentDirectory: my-api
      "
    `);
  });
});
