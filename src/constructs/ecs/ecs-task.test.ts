import { Template } from "aws-cdk-lib/assertions";
import type { ISubnet, IVpc } from "aws-cdk-lib/aws-ec2";
import { SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { GuTemplate, simpleGuStackForTesting } from "../../utils/test";
import type { GuStack } from "../core";
import { GuVpc, SubnetType } from "../ec2/vpc";
import { GuEcsTask } from "./ecs-task";

const makeVpc = (stack: GuStack) =>
  Vpc.fromVpcAttributes(stack, "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
    privateSubnetIds: ["abc-123"],
  });

const securityGroup = (stack: GuStack, app?: string) =>
  SecurityGroup.fromSecurityGroupId(stack, `hehe-${app ?? ""}`, "id-123");
const testPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["s3:GetObject"],
  resources: ["databaseSecretArn"],
});

describe("The GuEcsTask pattern", () => {
  it("should use the specified container", () => {
    const stack = simpleGuStackForTesting();

    new GuEcsTask(stack, "test-ecs-task", {
      containerConfiguration: { id: "node:10", type: "registry" },
      monitoringConfiguration: { noMonitoring: true },
      vpc: makeVpc(stack),
      app: "ecs-test",
    });

    Template.fromStack(stack).hasResourceProperties("AWS::ECS::TaskDefinition", {
      ContainerDefinitions: [{ Image: "node:10" }],
    });
  });

  const generateComplexStack = (stack: GuStack, app: string, vpc: IVpc, subnets?: ISubnet[]) => {
    new GuEcsTask(stack, `test-ecs-task-${app}`, {
      containerConfiguration: { id: "node:10", type: "registry" },
      vpc,
      subnets,
      app: app,
      taskTimeoutInMinutes: 60,
      cpu: 1024,
      memory: 1024,
      storage: 30,
      monitoringConfiguration: { snsTopicArn: "arn:something:else:here:we:goalarm-topic", noMonitoring: false },
      taskCommand: `echo "yo ho row ho it's a pirates life for me"`,
      securityGroups: [securityGroup(stack, app)],
      customTaskPolicies: [testPolicy],
    });
  };

  it("should create the correct resources with lots of config", () => {
    const stack = simpleGuStackForTesting();

    generateComplexStack(stack, "ecs-test", makeVpc(stack));

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should support having more than one scheduled task in the same stack", () => {
    const stack = simpleGuStackForTesting();

    const vpc = makeVpc(stack);

    generateComplexStack(stack, "ecs-test2", vpc);
    generateComplexStack(stack, "ecs-test", vpc);

    const template = GuTemplate.fromStack(stack);

    template.hasGuTaggedResource("AWS::ECS::TaskDefinition", { appIdentity: { app: "ecs-test" } });
    template.hasGuTaggedResource("AWS::ECS::TaskDefinition", { appIdentity: { app: "ecs-test2" } });
  });

  it("should default to private subnets when no subnet prop is specified", () => {
    const stack = simpleGuStackForTesting();

    generateComplexStack(stack, "ecs-private-subnet-test", makeVpc(stack));

    const template = Template.fromStack(stack);

    template.hasParameter("ecsprivatesubnettestPrivateSubnets", {
      Default: "/account/vpc/primary/subnets/private",
    });
  });

  it("should override private subnets when the `subnets` prop is specified", () => {
    const stack = simpleGuStackForTesting();
    const app = "ecs-public-subnet-test";

    generateComplexStack(
      stack,
      app,
      makeVpc(stack),
      GuVpc.subnetsFromParameter(stack, { type: SubnetType.PUBLIC, app })
    );

    const template = Template.fromStack(stack);
    template.hasParameter("ecspublicsubnettestPublicSubnets", {
      Default: "/account/vpc/primary/subnets/public",
    });
  });
});
