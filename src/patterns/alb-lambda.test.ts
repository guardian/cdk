import { Template } from "aws-cdk-lib/assertions";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import type { NoMonitoring } from "../constructs/cloudwatch";
import { simpleGuStackForTesting } from "../utils/test";
import {GuAlbLambda} from "./alb-lambda";
import {Vpc} from "aws-cdk-lib/aws-ec2";
import {Stack} from "aws-cdk-lib";

describe("The GuAlbLambda pattern", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: ["test1"]
  });

  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const noMonitoring: NoMonitoring = { noMonitoring: true };
    new GuAlbLambda(stack, "lambda", {
      fileName: "my-app.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: noMonitoring,
      app: "testing",
      vpc: vpc,
      vpcSubnets: {
        subnets: vpc.privateSubnets
      }
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  // it("should create an alarm if monitoring configuration is provided", () => {
  //   const stack = simpleGuStackForTesting();
  //   new GuAlbLambda(stack, "lambda", {
  //     fileName: "my-app.zip",
  //     handler: "handler.ts",
  //     runtime: Runtime.NODEJS_12_X,
  //     monitoringConfiguration: {
  //       http5xxAlarm: { tolerated5xxPercentage: 5 },
  //       snsTopicName: "alerts-topic",
  //     },
  //     app: "testing",
  //     api: {
  //       id: "api",
  //       description: "this is a test",
  //     },
  //   });
  //   Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  // });

  // it("should allow us to link a domain name to a LambdaRestApi", () => {
  //   const stack = simpleGuStackForTesting();
  //   const noMonitoring: NoMonitoring = { noMonitoring: true };
  //   const apiLambda = new GuApiLambda(stack, "lambda", {
  //     fileName: "my-app.zip",
  //     handler: "handler.ts",
  //     runtime: Runtime.NODEJS_12_X,
  //     monitoringConfiguration: noMonitoring,
  //     app: "testing",
  //     api: {
  //       id: "api",
  //       description: "this is a test",
  //     },
  //   });
  //
  //   const domain = apiLambda.api.addDomainName("domain", {
  //     domainName: "code.theguardian.com",
  //     certificate: new GuCertificate(stack, {
  //       app: "testing",
  //       domainName: "code.theguardian.com",
  //       hostedZoneId: "id123",
  //     }),
  //   });
  //
  //   new GuCname(stack, "DNS", {
  //     app: "testing",
  //     ttl: Duration.days(1),
  //     domainName: "code.theguardian.com",
  //     resourceRecord: domain.domainNameAliasDomainName,
  //   });
  //   expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  // });
  //
  // it("should route requests to $LATEST (i.e. an unpublished version) if the enableVersioning prop is unset", () => {
  //   const stack = simpleGuStackForTesting();
  //   const noMonitoring: NoMonitoring = { noMonitoring: true };
  //   new GuApiLambda(stack, "lambda", {
  //     fileName: "my-app.zip",
  //     handler: "handler.ts",
  //     runtime: Runtime.NODEJS_12_X,
  //     monitoringConfiguration: noMonitoring,
  //     app: "testing",
  //     api: {
  //       id: "api",
  //       description: "this is a test",
  //     },
  //   });
  //   Template.fromStack(stack).hasResourceProperties("AWS::ApiGateway::Method", {
  //     Integration: {
  //       Uri: {
  //         "Fn::Join": [
  //           "",
  //           [
  //             "arn:",
  //             {
  //               Ref: "AWS::Partition",
  //             },
  //             ":apigateway:",
  //             {
  //               Ref: "AWS::Region",
  //             },
  //             ":lambda:path/2015-03-31/functions/",
  //             {
  //               "Fn::GetAtt": ["lambda8B5974B5", "Arn"],
  //             },
  //             "/invocations",
  //           ],
  //         ],
  //       },
  //     },
  //   });
  // });
  //
  // it("should route requests to an alias if the enableVersioning prop is set to true", () => {
  //   const stack = simpleGuStackForTesting();
  //   const noMonitoring: NoMonitoring = { noMonitoring: true };
  //   new GuApiLambda(stack, "lambda", {
  //     enableVersioning: true,
  //     fileName: "my-app.zip",
  //     handler: "handler.ts",
  //     runtime: Runtime.NODEJS_12_X,
  //     monitoringConfiguration: noMonitoring,
  //     app: "testing",
  //     api: {
  //       id: "api",
  //       description: "this is a test",
  //     },
  //   });
  //   Template.fromStack(stack).hasResourceProperties("AWS::ApiGateway::Method", {
  //     Integration: {
  //       Uri: {
  //         "Fn::Join": [
  //           "",
  //           [
  //             "arn:",
  //             {
  //               Ref: "AWS::Partition",
  //             },
  //             ":apigateway:",
  //             {
  //               Ref: "AWS::Region",
  //             },
  //             ":lambda:path/2015-03-31/functions/",
  //             {
  //               Ref: "lambdaAliasForLambda426FBB83", // This is the important difference when compared to the test above
  //             },
  //             "/invocations",
  //           ],
  //         ],
  //       },
  //     },
  //   });
  // });
});
