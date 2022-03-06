import { Duration } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { GuCertificate } from "../constructs/acm";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { GuCname } from "../constructs/dns";
import { simpleGuStackForTesting } from "../utils/test";
import { GuApiLambda } from "./api-lambda";

describe("The GuApiLambda pattern", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    new GuApiLambda(stack, "lambda", {
      fileName: "my-app.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      app: "testing",
      apis: [
        {
          id: "api",
          description: "this is a test",
        },
        {
          id: "api2",
          description: "this is a test2",
        },
      ],
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should create an alarm if monitoring configuration is provided", () => {
    const stack = simpleGuStackForTesting();
    new GuApiLambda(stack, "lambda", {
      fileName: "my-app.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: {
        toleratedErrorPercentage: 99,
        snsTopicName: "alerts-topic",
      },
      app: "testing",
      apis: [
        {
          id: "api",
          description: "this is a test",
        },
        {
          id: "api2",
          description: "this is a test2",
        },
      ],
    });
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });

  it("should allow us to link a domain name to a LambdaRestApi", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    const apiLambda = new GuApiLambda(stack, "lambda", {
      fileName: "my-app.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      app: "testing",
      apis: [
        {
          id: "api",
          description: "this is a test",
        },
        {
          id: "api2",
          description: "this is a test2",
        },
      ],
    });
    const maybeApi = apiLambda.apis.get("api");
    expect(maybeApi).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- We expect api to be defined beyond this line
    const api = maybeApi!;
    const domain = api.addDomainName("domain", {
      domainName: "code.theguardian.com",
      certificate: new GuCertificate(stack, {
        app: "testing",
        domainName: "code.theguardian.com",
        hostedZoneId: "id123",
      }),
    });

    new GuCname(stack, "DNS", {
      app: "testing",
      ttl: Duration.days(1),
      domainName: "code.theguardian.com",
      resourceRecord: domain.domainNameAliasDomainName,
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
