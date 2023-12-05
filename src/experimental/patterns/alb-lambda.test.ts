import { Template } from "aws-cdk-lib/assertions";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import type { NoMonitoring } from "../../constructs/cloudwatch";
import { simpleGuStackForTesting } from "../../utils/test";
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

  it("should create an alarm if monitoring configuration is provided", () => {
    const stack = simpleGuStackForTesting();
    new GuAlbLambda(stack, "lambda", {
      fileName: "my-app.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      monitoringConfiguration: {
        http5xxAlarm: { tolerated5xxPercentage: 5 },
        snsTopicName: "alerts-topic",
        unhealthyInstancesAlarm: false
      },
      app: "testing"
    });
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });
});
