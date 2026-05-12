import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import type { Volume } from "aws-cdk-lib/aws-ecs";
import {
  Cluster,
  ContainerImage,
  FargateService,
  FargateTaskDefinition,
  FireLensLogDriver,
  FirelensLogRouterType,
  LogDriver,
  VersionConsistency,
} from "aws-cdk-lib/aws-ecs";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { GuCertificate } from "../../constructs/acm";
import type { AppIdentity, GuStack } from "../../constructs/core";
import { GuLoggingStreamNameParameter } from "../../constructs/core";
import { GuParameter } from "../../constructs/core";
import { GuHttpsEgressSecurityGroup, GuVpc, SubnetType } from "../../constructs/ec2";
import { GuParameterStoreReadPolicy } from "../../constructs/iam";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
} from "../../constructs/loadbalancing";
import type { GuDomainName } from "../../types";
import { GuRiffRaffDeploymentIdParameterExperimental } from "../constructs/riff-raff-deployment-id";

interface GuEcsAppProps extends AppIdentity {
  /**
   * Which image to run.
   * This should be the image digest (e.g. 'sha256:abc123') to ensure immutable deployments.
   *
   * @see https://docs.docker.com/dhi/core-concepts/digests
   */
  imageIdentifier: string;
  repositoryName: string;
  /**
   * Specify certificate for the load balancer.
   */
  certificateProps: GuDomainName; // ??? Do we need to share this?
  createLoadBalancerAndListener: boolean;
}

export class GuEcsAppExperimental extends Construct {
  public readonly targetGroup: GuApplicationTargetGroup;
  public readonly loadBalancer?: GuApplicationLoadBalancer;
  public readonly listener?: GuHttpsApplicationListener;
  constructor(scope: GuStack, props: GuEcsAppProps) {
    const { app, repositoryName, imageIdentifier, certificateProps, createLoadBalancerAndListener } = props;
    super(scope, `${app}-ecs`);
    const vpc = GuVpc.fromIdParameter(scope, "GuVpc");

    // FIXME - we should clean this up before moving this pattern out of experimental
    // Trying to use a GuVpc with the ECS Cluster construct fails with the following error:
    // ValidationError: There are no 'Public' subnet groups in this VPC. Available types:
    const vpcThatEcsClusterConstructWillAccept = Vpc.fromVpcAttributes(scope, "Vpc", {
      vpcId: vpc.vpcId,
      // We have to provide public subnet ids to avoid a validation error, but they are unused
      publicSubnetIds: [""],
      // This seems to be the important bit that is missing from the IVpc that GuCDK provides
      privateSubnetIds: new GuParameter(scope, "VpcPrivateSubnetsParam", {
        fromSSM: true,
        default: "/account/vpc/primary/subnets/private",
        type: "List<String>",
      }).valueAsList,
      availabilityZones: [""], // The type system forces us to provide this, but it doesn't actually seem to be needed
    });

    const cluster = new Cluster(scope, "EcsCluster", {
      // We have to pass in an IVpc here, but the generated CFN only actually references the private subnets ids when
      // setting up the ECS service.
      vpc: vpcThatEcsClusterConstructWillAccept,
    });

    // Need to figure out how to make this cross-account, but this is fine for the simple case where the app and the
    // ECR repo are both in the Deploy Tools account
    const image = ContainerImage.fromEcrRepository(
      Repository.fromRepositoryName(scope, "Repo", repositoryName),
      imageIdentifier,
    );

    const loggingStreamName = GuLoggingStreamNameParameter.getInstance(scope).valueAsString;

    const fireLensLogDriver = new FireLensLogDriver({
      options: {
        Name: `kinesis_streams`,
        region: scope.region,
        stream: loggingStreamName,
        retry_limit: "2",
      },
    });

    const taskDefinition = new FargateTaskDefinition(
      scope,
      "EcsTaskDefinition",
      // The defaults from AWS CDK are extremely low so it probably makes sense for us to encode something different
      // via our pattern - we already do this for Lambda:
      // https://github.com/guardian/cdk/blob/b567f1219dab416680a68981a488bbbf3564fe2d/src/constructs/lambda/lambda.ts#L65-L76
      { memoryLimitMiB: 2048, cpu: 1024 }, // FIXME - users should be able to pass their own values via props
    );

    taskDefinition.addContainer(app, {
      image,
      dockerLabels: {
        RiffRaffDeploymentId: GuRiffRaffDeploymentIdParameterExperimental.getInstance(scope).valueAsString,
      },
      // This speeds up deployment. We don't need this enabled if users follow the advice to refer to their image
      // using the immutable digest
      versionConsistency: VersionConsistency.DISABLED,
      portMappings: [{ containerPort: 9000 }], // FIXME - users should set this value via a prop
      logging: fireLensLogDriver,
      readonlyRootFilesystem: true,
    });

    // Grant standard log shipping and config read permissions to the app
    const logShippingPolicy = new PolicyStatement({
      actions: ["kinesis:Describe*", "kinesis:Put*"],
      effect: Effect.ALLOW,
      resources: [
        scope.formatArn({
          service: "kinesis",
          resource: "stream",
          resourceName: loggingStreamName,
        }),
      ],
    });
    taskDefinition.addToTaskRolePolicy(logShippingPolicy);

    new GuParameterStoreReadPolicy(scope, { app: `${app}-ecs` }).attachToRole(taskDefinition.taskRole);

    // FIXME - allow users to easily pass in their own IAM permissions; similar to GuInstanceRoleProps

    /*
    GuardDuty is enabled at the organisation level and runs as a sidecar.
    We need to add specific permissions to allow pulling the GuardDuty image.
    See https://docs.aws.amazon.com/guardduty/latest/ug/prereq-runtime-monitoring-ecs-support.html.
     */
    const guardDutyPolicies = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage"],
        resources: [
          // See https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring-ecr-repository-gdu-agent.html
          "arn:aws:ecr:eu-west-1:694911143906:repository/aws-guardduty-agent-fargate",
        ],
      }),
    ];

    guardDutyPolicies.forEach((policy) => taskDefinition.addToExecutionRolePolicy(policy));

    const ecsService = new FargateService(scope, "EcsService", {
      cluster,
      taskDefinition,
      // Important for service deployments; with the AWS defaults the service can be scaled down when deploying
      minHealthyPercent: 100,
      // Also important for service deployments; with the AWS defaults we don't get a fast failure when deploying a 'bad' build
      circuitBreaker: { enable: true, rollback: true },
      // By default, AWS will create a new security group which allows all outbound traffic
      // We don't want this so explicitly allow outbound HTTPS only
      // This is what we do for the current GuEc2App pattern:
      // https://github.com/guardian/cdk/blob/3b5688637024642055ed0bf576f668e56e40830d/src/constructs/autoscaling/asg.ts#L143-L145
      securityGroups: [
        GuHttpsEgressSecurityGroup.forVpc(scope, {
          app: `${app}-ecs`,
          vpc,
        }),
      ],
    });

    ecsService.autoScaleTaskCount({
      minCapacity: 3, // FIXME - users should be able to set these values via props
      maxCapacity: 6,
    });

    // We need a new target group even if we share the other load balancer components with the EC2 infrastructure
    const targetGroup = new GuApplicationTargetGroup(scope, "EcsTargetGroup", {
      vpc,
      app,
      port: 9000, // FIXME - users should set this value via a prop
      targetGroupName: `${app}-${scope.stage}`, // Add the name here to make it more easily identifiable in the console etc.
      targets: [ecsService],
    });

    // FIXME - add AppAccess support to load balancer and listener (currently this only supports 'PUBLIC')
    if (createLoadBalancerAndListener) {
      // The id here must be the same as the one used by GuEc2App
      const loadBalancer = new GuApplicationLoadBalancer(scope, "LoadBalancer", {
        app,
        vpc,
        internetFacing: true,
        vpcSubnets: {
          subnets: GuVpc.subnetsFromParameter(scope, {
            type: SubnetType.PUBLIC,
            app,
          }),
        },
        withAccessLogging: true,
      });
      this.loadBalancer = loadBalancer;

      // Similarly the id here must be the same as the one used by GuEc2App
      const listener = new GuHttpsApplicationListener(scope, "Listener", {
        app,
        loadBalancer,
        certificate: new GuCertificate(scope, {
          app,
          domainName: certificateProps.domainName,
          hostedZoneId: certificateProps.hostedZoneId,
        }),
        targetGroup,
        // When open=true, AWS will create a security group which allows all inbound traffic over HTTPS
        open: true,
      });
      this.listener = listener;
    }

    const logRouter = taskDefinition.addFirelensLogRouter("LogShipping", {
      // See https://github.com/guardian/devx-logs
      image: ContainerImage.fromRegistry("ghcr.io/guardian/devx-logs:2.1.0"),

      // Required by https://github.com/guardian/devx-logs
      environment: {
        STACK: scope.stack,
        STAGE: scope.stage,
        APP: app,
        GU_REPO: repositoryName,
        TASK_NAME: app,
      },

      // Send this container's logs to CloudWatch logs, retained for 1 day
      logging: LogDriver.awsLogs({
        streamPrefix: [scope.stack, scope.stage, app, "devx-logs-sidecar"].join("/"),
        logRetention: RetentionDays.ONE_DAY,
      }),

      firelensConfig: {
        type: FirelensLogRouterType.FLUENTBIT,
      },

      // To comply with FSBP ECS.5
      readonlyRootFilesystem: true,
    });

    const logVolume: Volume = {
      name: "logging-volume",
    };
    taskDefinition.addVolume(logVolume);

    logRouter.addMountPoints({
      containerPath: "/init",
      sourceVolume: logVolume.name,
      readOnly: false,
    });

    this.targetGroup = targetGroup;
  }
}
