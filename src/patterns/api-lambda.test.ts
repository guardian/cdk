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
      api: {
        id: "api",
        description: "this is a test",
      },
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
      api: {
        id: "api",
        description: "this is a test",
      },
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
      api: {
        id: "api",
        description: "this is a test",
      },
    });

    const domain = apiLambda.api.addDomainName("domain", {
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
