import { Template } from "aws-cdk-lib/assertions";
import type { IVpc } from "aws-cdk-lib/aws-ec2";
import { SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { GuTemplate, simpleGuStackForTesting, simpleTestingResources } from "../../utils/test";
import { GuApp } from "../core";
import type { GuStack } from "../core";
import { GuEcsTask } from "./ecs-task";

const makeVpc = (scope: GuStack) =>
  Vpc.fromVpcAttributes(scope, "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: ["abc-123"],
  });

const securityGroup = (scope: GuApp) => SecurityGroup.fromSecurityGroupId(scope, `hehe-${scope.app}`, "id-123");

const testPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["s3:GetObject"],
  resources: ["databaseSecretArn"],
});

describe("The GuEcsTask pattern", () => {
  it("should use the specified container", () => {
    const { stack, app } = simpleTestingResources({ appName: "ecs-test" });

    new GuEcsTask(app, "test-ecs-task", {
      containerConfiguration: { id: "node:10", type: "registry" },
      monitoringConfiguration: { noMonitoring: true },
      vpc: makeVpc(stack),
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ECS::TaskDefinition", {
      ContainerDefinitions: [{ Image: "node:10" }],
    });
  });

  const generateComplexStack = (scope: GuApp, vpc: IVpc) => {
    new GuEcsTask(scope, `test-ecs-task-${scope.app}`, {
      containerConfiguration: { id: "node:10", type: "registry" },
      vpc,
      taskTimeoutInMinutes: 60,
      cpu: 1024,
      memory: 1024,
      storage: 30,
      monitoringConfiguration: { snsTopicArn: "arn:something:else:here:we:goalarm-topic", noMonitoring: false },
      taskCommand: `echo "yo ho row ho it's a pirates life for me"`,
      securityGroups: [securityGroup(scope)],
      customTaskPolicies: [testPolicy],
    });
  };

  it("should create the correct resources with lots of config", () => {
    const { stack, app } = simpleTestingResources({ appName: "ecs-test" });

    generateComplexStack(app, makeVpc(stack));

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should support having more than one scheduled task in the same stack", () => {
    const stack = simpleGuStackForTesting();

    const vpc = makeVpc(stack);

    const app1 = new GuApp(stack, "ecs-test2");
    const app2 = new GuApp(stack, "ecs-test");

    generateComplexStack(app1, vpc);
    generateComplexStack(app2, vpc);

    const template = GuTemplate.fromStack(stack);

    template.hasGuTaggedResource("AWS::ECS::TaskDefinition", { app: app1 });
    template.hasGuTaggedResource("AWS::ECS::TaskDefinition", { app: app2 });
  });
});
