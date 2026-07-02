import { ArnFormat, Aspects, Duration, SecretValue, Tags } from "aws-cdk-lib";
import type { BlockDevice, CfnAutoScalingGroup, UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";
import { AdditionalHealthCheckType, HealthChecks } from "aws-cdk-lib/aws-autoscaling";
import {
  ProviderAttribute,
  UserPool,
  UserPoolClientIdentityProvider,
  UserPoolIdentityProviderGoogle,
} from "aws-cdk-lib/aws-cognito";
import type { InstanceType, ISubnet, IVpc } from "aws-cdk-lib/aws-ec2";
import { UserData } from "aws-cdk-lib/aws-ec2";
import { Repository } from "aws-cdk-lib/aws-ecr";
import type { Volume } from "aws-cdk-lib/aws-ecs";
import { PropagatedTagSource } from "aws-cdk-lib/aws-ecs";
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
import type { HealthCheck as ALBHealthCheck } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ListenerAction } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { AuthenticateCognitoAction } from "aws-cdk-lib/aws-elasticloadbalancingv2-actions";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { AccessScope, MetadataKeys, NAMED_SSM_PARAMETER_PATHS } from "../../constants";
import { GuCertificate } from "../../constructs/acm";
import type { GuUserDataProps } from "../../constructs/autoscaling";
import { GuUserData } from "../../constructs/autoscaling";
import { GuAutoScalingGroup } from "../../constructs/autoscaling";
import type { NoMonitoring } from "../../constructs/cloudwatch";
import {
  GuAlb4xxPercentageAlarm,
  GuAlb5xxPercentageAlarm,
  GuUnhealthyInstancesAlarm,
} from "../../constructs/cloudwatch";
import type { GuStack } from "../../constructs/core";
import { AppIdentity } from "../../constructs/core";
import { GuLoggingStreamNameParameter } from "../../constructs/core";
import { GuHttpsEgressSecurityGroup, GuSecurityGroup, GuVpc, SubnetType } from "../../constructs/ec2";
import type { GuInstanceRoleProps, GuPolicy } from "../../constructs/iam";
import { GuLogShippingPolicy } from "../../constructs/iam";
import { GuInstanceRole } from "../../constructs/iam";
import { GuGetPrivateConfigPolicy } from "../../constructs/iam";
import { GuParameterStoreReadPolicy } from "../../constructs/iam";
import { GuLambdaFunction } from "../../constructs/lambda";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
  type WafProps,
} from "../../constructs/loadbalancing";
import type { Alarms, ApplicationLoggingProps } from "../../patterns";
import { restrictedCidrRanges } from "../../patterns";
import { AppAccess } from "../../types";
import type { GuAsgCapacity, GuDomainName } from "../../types";
import type { AmigoProps } from "../../types/amigo";
import { getUserPoolDomainPrefix } from "../../utils/cognito/cognito";
import { GuRiffRaffDeploymentIdParameterExperimental } from "../constructs/riff-raff-deployment-id";
import {
  GuAutoScalingRollingUpdateTimeoutExperimental,
  GuHorizontallyScalingDeploymentPropertiesExperimental,
  GuRoleForRollingUpdateExperimental,
  GuRollingUpdatePolicyExperimental,
  GuUserDataForRollingUpdateExperimental,
} from "./ec2-app";

export interface GuLoadBalancedAppExperimentalProps extends AppIdentity {
  /**
   * Network access restrictions for your load balancer.
   *
   * Note, this merely provides defence in depth; you should NOT rely on network access restrictions alone for
   * restricting access. Use Google Auth for human access, or a suitable machine auth mechanism.
   */
  access: AppAccess;
  /**
   * The port your application runs on.
   */
  applicationPort: number;
  /**
   * Enable access logging for this load balancer.
   * Access logs are written to an S3 bucket within your AWS account.
   * The bucket is created by {@link https://github.com/guardian/aws-account-setup}.
   * The logs are queryable via the `gucdk_access_logs` Athena database.
   *
   * @defaultValue true
   */
  withAccessLogging?: boolean;
  /**
   * Enable and configure alarms.
   */
  monitoringConfiguration: Alarms | NoMonitoring;
  /**
   * Specify certificate for the load balancer.
   */
  certificateProps?: GuDomainName;
  /**
   * Specify the VPC to use.
   *
   * @see https://github.com/guardian/aws-account-setup
   */
  vpc?: IVpc;
  /**
   * Specify private subnets if using a non-default VPC or (generally
   * discouraged) to limit to a subset of the available subnets.
   */
  privateSubnets?: ISubnet[];

  /**
   * Specify public subnets if using a non-default VPC or (generally
   * discouraged) to limit to a subset of the available subnets.
   */
  publicSubnets?: ISubnet[];
  /**
   * Configure Google Auth.
   */
  googleAuth?: {
    /**
     * Enables Google Auth (via Cognito). **Additional MANUAL steps required -
     * see below.**
     *
     * Limits access to members of the allowed Google groups.
     *
     * Note, this does not currently support simultaneous machine access, so
     * only set to true if you only require staff access to your service, or are
     * supporting machine access in some other way.
     *
     * MANUAL STEPS: to get this to work, we need a Google Project and
     * associated credentials. Full instructions can be found here:
     *
     * https://docs.google.com/document/d/1_k1FSE52AZHXufWLTiKTI3xy5cGpziyHazSHTKrYfco/edit?usp=sharing
     *
     * DevX hope to automate this process in the near future.
     */
    enabled: true;
    /**
     * The domain users will access your service.
     *
     * Set this to the same as for certificateProps.
     */
    domain: string;
    /**
     * Groups used for membership checks.
     *
     * If specified, cannot be empty. Users must be a member of at least one
     * group to gain access.
     *
     * WARNING: groups must be specified with the `guardian.co.uk` domain, even
     * if that is the non-idiomatic choice for daily use.
     *
     * @defaultValue [`engineering@guardian.co.uk`]
     */
    allowedGroups?: string[];
    /**
     * The number of minutes before the session expires.
     *
     * Set this value to a safe period of time that revoked users
     * sessions will continue to function.
     *
     * NOTE: This value cannot be larger than 60 minutes.
     *
     * @defaultValue 15
     */
    sessionTimeoutInMinutes?: number;
    /**
     * Secrets Manager path containing Google OAuth2 Client credentials.
     *
     * NOTE: you do not need to set this value, but you DO need to generate and
     * store the associated credentials in Secrets Manager.
     *
     * Credentials should be stored in Secrets Manager as JSON:
     *
     * ```json
     * {
     *   "clientId": "my-client-id",
     *   "clientSecret": "my-client-secret"
     * }
     * ```
     *
     * @see `googleAuth.enabled` for how to generate.
     *
     * @defaultValue /:STAGE/:stack/:app/google-auth-credentials
     */
    credentialsSecretsManagerPath?: string;

    /**
     * When using Auth in the ALB, which stage of cognito-lambda to use.
     *
     * For most applications this should always be PROD, even in the CODE environments.
     *
     * @defaultValue PROD
     */
    cognitoAuthStage?: string;
  };

  /**
   * Specify custom healthcheck settings for your load balancer's target group(s).
   */
  healthcheck?: ALBHealthCheck;

  /**
   * Any additional permissions needed to run the application.
   */
  additionalPolicies?: GuPolicy[];

  /**
   * You can specify if the arn of this load balancer should be exposed for protection via WAF
   *
   * If this value changes, it is only picked up on WAF configuration redeploy.
   *
   * NB this parameter setting _alone_ is not sufficient to protect the application.
   * You must also ensure that the application and stage combination is present in the WAF
   * configuration.
   *
   * See https://github.com/guardian/waf/tree/main/lib
   *
   * There is a "gotcha" when migrating to this functionality.  You may not change only the Logical
   * ID of an SSM Parameter (see https://docs.aws.amazon.com/cdk/v2/guide/identifiers.html) and the
   * parameter name must be of the required form, meaning you cannot have an alternate name.
   *
   * You can either:
   *
   * Remove the old param and immediately redeploy with the new param (this does not affect
   * protection unless and until the WAF configuration is redeployed)
   *
   *   OR
   *
   * Create an escape hatch by overriding the logical id (see "ssm param escape hatch" test for example)
   **/
  waf?: WafProps;
  /**
   * If you want to use an AutoScaling Group with EC2 instances to serve requests, then pass in relevant props here.
   *
   * If you are setting both `ec2Props` and `ecsProps` (i.e. if you are migrating from EC2 to ECS) then you must also
   * specify weights for each compute type using `targetGroupWeights`.
   */
  ec2Props?: {
    /**
     * User data for the autoscaling group.
     */
    userData: GuUserDataProps | UserData;
    /**
     * EC2 instance type. Note, ensure your code is built for the same
     * architecture family (arm64 - 'Graviton' instances - or x64).
     */
    instanceType: InstanceType;
    /**
     * Enable and configures application logs.
     */
    applicationLogging?: ApplicationLoggingProps;

    /**
     * Add block devices (additional storage).
     */
    blockDevices?: BlockDevice[];
    /**
     * Autoscaling group min and max sizes.
     */
    scaling: GuAsgCapacity;
    /**
     * Configure AMIgo image recipe. This is only necessary if you are using GuCDK to generate your riff-raff.yaml file.
     */
    imageRecipe?: string | AmigoProps;
    /**
     * Set http put response hop limit for the launch template.
     * It can be necessary to raise this value from the default of 1
     * for example when sharing the instance profile with a docker container running on the instance.
     */
    instanceMetadataHopLimit?: number;

    /**
     * Specify an update policy for the ASG created by this pattern.
     *
     * @see https://docs.aws.amazon.com/cdk/api/latest/docs/aws-autoscaling-readme.html#update-policy
     *
     * @defaultValue UpdatePolicy.none() - Cloudformation does not attempt to rotate instances in the ASG
     * and must rely on riffraff to do so.
     */
    updatePolicy?: UpdatePolicy;
    /**
     * Enable CloudFormation-only deployments for EC2.
     *
     * In order to use this feature you must include the build number in the name of the artifact that you upload to
     * Riff-Raff. Your userData should also refer to this versioned artifact.
     *
     * Users migrating from the `GuEc2AppExperimental` pattern can keep existing deployment behaviour by configuring
     * these props.
     */
    versionedDeployments?: {
      enabled: boolean;
      buildIdentifier: string;
      slowStartDuration?: Duration;
    };
    /**
     * You can specify how long after an instance reaches the InService state it waits before contributing
     * usage data to the aggregated metrics. This specified time is called the default instance warmup.
     * This keeps dynamic scaling from being affected by metrics for individual instances that aren't yet
     * handling application traffic and that might be experiencing temporarily high usage of compute resources.
     *
     * @see https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-default-instance-warmup.html
     */
    defaultInstanceWarmup?: Duration;
    /**
     * How often to send EC2 metrics, such as CPU usage.
     * By default, AWS will produce `5Minute` granular metrics.
     *
     * It is recommended to produce `1Minute` granular metrics in production,
     * especially when using ASG metrics to trigger horizontal scaling as it allows for earlier scaling.
     *
     * @see https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
     */
    instanceMetricGranularity: "1Minute" | "5Minute";
  };
  /**
   * If you want to use an ECS service and ECS tasks to serve requests, then pass in relevant props here.
   *
   * If you are setting both `ecsProps` and `ec2Props` (i.e. if you are migrating from EC2 to ECS) then you must also
   * specify weights for each compute type using `targetGroupWeights`.
   */
  ecsProps?: {
    /**
     * Which image to run.
     * This should be the image digest (e.g. 'sha256:abc123') to ensure immutable deployments.
     *
     * @see https://docs.docker.com/dhi/core-concepts/digests
     */
    imageIdentifier: string;
    cpu: number;
    memoryLimitMiB: number;
    /**
     * ECR repository name which contains your images. This defaults to the name of your GitHub repository as we
     * expect there to be a one-to-one mapping between GitHub repositories and ECR repositories.
     */
    repositoryName?: string;
    /**
     * The number of tasks that you want to run. We recommend running 3 tasks for production services which need a high
     * level of availability so that all 3 Availability Zones are utilised.
     */
    scaling: {
      /**
       * Scaling actions will never scale down below this threshold. This also controls the number of tasks that
       * your ECS service will launch when it is first created.
       */
      minimumTasks: number;
      /**
       * Scaling actions will never scale up above this threshold.
       *
       * Note that this max can be exceeded when a deployment runs (unlike the ASG max size). E.g. if maximumTasks is 6,
       * the service is running 6 tasks and a deployment starts, the ECS service will briefly run with 12 tasks to get
       * the deployment through.
       */
      maximumTasks: number;
    };
  };
  /**
   * If you are specifying `ec2Props` and `ecsProps` use these weights to distribute traffic across the different compute types.
   * Each weight must be between 0 and 999. AWS will work out the relative percentage.
   *
   * @example - Send 10% of traffic to ECS:
   *
   * ```ts
   * targetGroupWeights: {
   *   ecs: 1,
   *   ec2: 9
   * }
   * ```
   */
  targetGroupWeights?: {
    ecs: number;
    ec2: number;
  };
}

interface TargetGroups {
  ec2?: GuApplicationTargetGroup;
  ecs?: GuApplicationTargetGroup;
}

export class GuLoadBalancedAppExperimental extends Construct {
  /**
   * The VPC that the pattern's load balancer, EC2 instances and/or ECS tasks are running in.
   */
  public readonly vpc: IVpc;
  /**
   * The certificate associated with your load balancer. This will only be available if `certificateProps` were
   * passed in.
   */
  public readonly certificate?: GuCertificate;
  /**
   * The application load balancer that this pattern creates.
   */
  public readonly loadBalancer: GuApplicationLoadBalancer;
  /**
   * The AutoScaling Group that this pattern creates. This will only be available if `ec2Props` are specified.
   */
  public readonly autoScalingGroup?: GuAutoScalingGroup;
  /**
   * The ECS Service that this pattern creates. This will only be available if `ecsProps` are specified.
   */
  public readonly ecsService?: FargateService;
  /**
   * The load balancer listener that this pattern creates.
   */
  public readonly listener: GuHttpsApplicationListener;
  /**
   * The target groups capable of serving traffic routed to this pattern.
   *
   * If `ec2Props` were passed in but `ecsProps` were not, there will be a single EC2 target group.
   * Similarly, if `ecsProps` were passed in but `ec2Props` were not, there will be a single ECS target group.
   * If both `ec2Props` and `ecsProps` were passed in (e.g. during a migration) then both target groups will be
   * available.
   */
  public readonly targetGroups: TargetGroups;

  constructor(scope: GuStack, props: GuLoadBalancedAppExperimentalProps) {
    const {
      access,
      withAccessLogging = true,
      app,
      applicationPort,
      certificateProps,
      monitoringConfiguration,
      vpc = GuVpc.fromIdParameter(scope, AppIdentity.suffixText({ app }, "VPC")),
      privateSubnets = GuVpc.subnetsFromParameter(scope, { type: SubnetType.PRIVATE, app }),
      publicSubnets = GuVpc.subnetsFromParameter(scope, { type: SubnetType.PUBLIC, app }),
      waf,
      healthcheck,
      ec2Props,
      ecsProps,
      targetGroupWeights,
      additionalPolicies = [],
    } = props;

    super(scope, app); // The assumption is `app` is unique

    let targetGroups: TargetGroups = {};

    // Setup EC2-specific infrastructure
    if (ec2Props) {
      const {
        applicationLogging = { enabled: false },
        blockDevices,
        instanceType,
        scaling: { minimumInstances, maximumInstances = minimumInstances * 2 },
        userData: userDataLike,
        imageRecipe,
        instanceMetadataHopLimit,
        versionedDeployments,
        updatePolicy,
        defaultInstanceWarmup,
        instanceMetricGranularity,
      } = ec2Props;

      const userData =
        userDataLike instanceof UserData ? userDataLike : new GuUserData(scope, { ...userDataLike, app });
      const maybePrivateConfigPolicy =
        userData instanceof GuUserData && userData.configuration
          ? [new GuGetPrivateConfigPolicy(scope, "GetPrivateConfigFromS3Policy", userData.configuration)]
          : [];
      const mergedRoleConfiguration: GuInstanceRoleProps = {
        additionalPolicies: maybePrivateConfigPolicy.concat(additionalPolicies),
      };

      if (versionedDeployments?.enabled && updatePolicy) {
        throw new Error("If versionedDeployments are enabled then updatePolicy should not be set via ec2Props");
      }
      const asgUpdatePolicy = versionedDeployments
        ? GuRollingUpdatePolicyExperimental.getPolicy(
            maximumInstances,
            minimumInstances,
            versionedDeployments.slowStartDuration,
          )
        : updatePolicy;

      const autoScalingGroup = new GuAutoScalingGroup(scope, "AutoScalingGroup", {
        app,
        vpc,
        instanceType,
        minimumInstances,
        maximumInstances,
        role: new GuInstanceRole(scope, { app, ...mergedRoleConfiguration }),

        healthChecks: HealthChecks.withAdditionalChecks({
          additionalTypes: [AdditionalHealthCheckType.ELB],
          gracePeriod: Duration.minutes(2),
        }),

        userData: userData instanceof GuUserData ? userData.userData : userData,
        vpcSubnets: { subnets: privateSubnets },
        ...(blockDevices && { blockDevices }),
        imageRecipe,
        httpPutResponseHopLimit: instanceMetadataHopLimit,
        updatePolicy: asgUpdatePolicy,
        defaultInstanceWarmup,
        instanceMetricGranularity,
      });

      // This allows automatic shipping of instance Cloud Init logs when using the
      // `cdk-base` Amigo role on your AMI.
      Tags.of(autoScalingGroup).add(
        MetadataKeys.LOG_KINESIS_STREAM_NAME,
        GuLoggingStreamNameParameter.getInstance(scope).valueAsString,
      );

      const ec2TargetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
        app,
        vpc,
        protocol: ApplicationProtocol.HTTP,
        targets: [autoScalingGroup],
        port: applicationPort,
        healthCheck: healthcheck,
      });

      targetGroups = {
        ec2: ec2TargetGroup,
      };

      if (versionedDeployments?.enabled) {
        const slowStartDurationInSeconds = versionedDeployments.slowStartDuration?.toSeconds();
        if (slowStartDurationInSeconds && (slowStartDurationInSeconds < 30 || slowStartDurationInSeconds > 900)) {
          throw new Error("Slow start duration must be between 30 and 900 seconds");
        }

        const cfnAutoScalingGroup = autoScalingGroup.node.defaultChild as CfnAutoScalingGroup;
        // Note: if the service uses horizontal scaling, this property is unset by an Aspect (to prevent accidental scale downs!)
        cfnAutoScalingGroup.desiredCapacity = minimumInstances.toString();

        new GuRoleForRollingUpdateExperimental(scope, { autoScalingGroup });
        new GuUserDataForRollingUpdateExperimental(scope, {
          autoScalingGroup: autoScalingGroup,
          targetGroup: ec2TargetGroup,
          applicationPort: applicationPort,
          buildIdentifier: versionedDeployments.buildIdentifier,
          slowStartDuration: versionedDeployments.slowStartDuration,
        });

        // This is used when an ASG is first created; it is not needed to support the new deployment mechanism but we
        // include it here to avoid creating an unnecessary snapshot diff for existing users of this feature
        cfnAutoScalingGroup.cfnOptions.creationPolicy = {
          autoScalingCreationPolicy: {
            minSuccessfulInstancesPercent: 100,
          },
          resourceSignal: {
            count: minimumInstances,
          },
        };

        const allAspects = Aspects.of(scope).all;
        const maybeRollingUpdateTimeoutAspect = allAspects.find(
          (_) => _ instanceof GuAutoScalingRollingUpdateTimeoutExperimental,
        );
        if (!maybeRollingUpdateTimeoutAspect) {
          Aspects.of(scope).add(new GuAutoScalingRollingUpdateTimeoutExperimental());
        }
        Aspects.of(scope).add(new GuHorizontallyScalingDeploymentPropertiesExperimental());
      }

      if (applicationLogging.enabled) {
        // This allows automatic shipping of application logs when using the
        // `cdk-base` Amigo role on your AMI.
        Tags.of(autoScalingGroup).add(
          MetadataKeys.SYSTEMD_UNIT,
          applicationLogging.systemdUnitName ? `${applicationLogging.systemdUnitName}.service` : `${app}.service`,
        );
      }

      this.autoScalingGroup = autoScalingGroup;
    }

    // Setup ECS-specific infrastructure
    if (ecsProps) {
      const { cpu, memoryLimitMiB, imageIdentifier, scaling } = ecsProps;

      const ecrRepoName = ecsProps.repositoryName ?? scope.repositoryName;
      if (!ecrRepoName) {
        throw new Error("Could not determine an ECR repository name; please set this manually via ecsProps");
      }

      const cluster = new Cluster(this, "EcsCluster", { vpc });

      const image = ContainerImage.fromEcrRepository(
        // Images are published to the ECR registry in the DeployTools account, so reference that here
        Repository.fromRepositoryAttributes(this, "Repo", {
          repositoryArn: scope.formatArn({
            account: StringParameter.fromStringParameterName(
              scope,
              "DeployToolsAccountId",
              NAMED_SSM_PARAMETER_PATHS.DeployToolsAccountId.path,
            ).stringValue,
            arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
            resource: "repository",
            resourceName: ecrRepoName,
            service: "ecr",
          }),
          repositoryName: ecrRepoName,
        }),
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

      const taskDefinition = new FargateTaskDefinition(scope, "EcsTaskDefinition", { memoryLimitMiB, cpu });

      taskDefinition.addContainer(app, {
        image,
        dockerLabels: {
          RiffRaffDeploymentId: GuRiffRaffDeploymentIdParameterExperimental.getInstance(scope).valueAsString,
        },
        // This speeds up deployment. We don't need this enabled if users follow the advice to refer to their image
        // using the immutable digest
        versionConsistency: VersionConsistency.DISABLED,
        portMappings: [{ containerPort: applicationPort }],
        logging: fireLensLogDriver,
        readonlyRootFilesystem: true,
      });

      // Grant standard log shipping and config read permissions to the app
      GuLogShippingPolicy.getInstance(scope).attachToRole(taskDefinition.taskRole);
      new GuParameterStoreReadPolicy(scope, { app: `${app}-ecs` }).attachToRole(taskDefinition.taskRole);

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
        vpcSubnets: { subnets: privateSubnets },
        // Important for service deployments; with the AWS defaults the service can be scaled down when deploying
        minHealthyPercent: 100,
        // Also important for service deployments; with the AWS defaults we don't get a fast failure when deploying a 'bad' build
        circuitBreaker: { enable: true, rollback: true },
        propagateTags: PropagatedTagSource.SERVICE,
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
        minCapacity: scaling.minimumTasks,
        maxCapacity: scaling.maximumTasks,
      });

      this.ecsService = ecsService;

      const env =
        // Required by https://github.com/guardian/devx-logs
        {
          STACK: scope.stack,
          STAGE: scope.stage,
          APP: app,
          TASK_NAME: app,
        };

      // Add the GitHub repo if we can
      const environment = scope.repositoryName ? { ...env, GU_REPO: scope.repositoryName } : env;

      // It's possible to opt-out of log shipping to ELK in the EC2 patterns; should we mirror that here?
      const logRouter = taskDefinition.addFirelensLogRouter("LogShipping", {
        // See https://github.com/guardian/devx-logs
        image: ContainerImage.fromRegistry(
          "ghcr.io/guardian/devx-logs@sha256:cf91724a5166f1c143e07958820aa2122afb61c164b68555d15cb92abb5acda0",
        ),
        // Required by https://github.com/guardian/devx-logs
        environment,
        versionConsistency: VersionConsistency.DISABLED,
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

      // We need a new target group even if we share the other load balancer components with the EC2 infrastructure
      const ecsTargetGroup = new GuApplicationTargetGroup(scope, "EcsTargetGroup", {
        vpc,
        app,
        port: applicationPort,
        targets: [ecsService],
        healthCheck: healthcheck,
      });

      targetGroups = {
        ...targetGroups,
        ecs: ecsTargetGroup,
      };
    }

    // Set up the load balancer and listener components
    AppAccess.validate(access);

    const certificate =
      typeof certificateProps !== "undefined"
        ? new GuCertificate(scope, {
            app,
            domainName: certificateProps.domainName,
            hostedZoneId: certificateProps.hostedZoneId,
          })
        : undefined;

    const loadBalancer = new GuApplicationLoadBalancer(scope, "LoadBalancer", {
      app,
      vpc,
      // Setting internetFacing to true does not necessarily allow public access to the load balancer itself. That is handled by the listener's `open` prop.
      internetFacing: access.scope !== AccessScope.INTERNAL,
      vpcSubnets: {
        subnets: access.scope === AccessScope.INTERNAL ? privateSubnets : publicSubnets,
      },
      withAccessLogging,
      waf,
    });

    const defaultAction: ListenerAction = configureListenerActions(targetGroups, targetGroupWeights);

    const listener = new GuHttpsApplicationListener(scope, "Listener", {
      app,
      loadBalancer,
      certificate,
      defaultAction,
      // When open=true, AWS will create a security group which allows all inbound traffic over HTTPS
      open: access.scope === AccessScope.PUBLIC && typeof certificate !== "undefined",
    });

    // Since AWS won't create a security group automatically when open=false, we need to add our own
    if (access.scope !== AccessScope.PUBLIC) {
      loadBalancer.addSecurityGroup(
        new GuSecurityGroup(scope, `${access.scope}IngressSecurityGroup`, {
          app,
          vpc,
          description: "Allow restricted ingress from CIDR ranges",
          allowAllOutbound: false,
          ingresses: restrictedCidrRanges(access.cidrRanges),
        }),
      );
    }

    if (props.googleAuth?.enabled) {
      const prefix = `/${scope.stage}/${scope.stack}/${app}`;

      const {
        allowedGroups = ["engineering@guardian.co.uk"],
        sessionTimeoutInMinutes = 15,
        credentialsSecretsManagerPath = `${prefix}/google-auth-credentials`,
      } = props.googleAuth;

      if (sessionTimeoutInMinutes > 60) {
        throw new Error("googleAuth.sessionTimeoutInMinutes must be <= 60!");
      }

      if (allowedGroups.length < 1) {
        throw new Error("googleAuth.allowedGroups cannot be empty!");
      }

      if (allowedGroups.find((group) => !group.endsWith("@guardian.co.uk"))) {
        throw new Error("googleAuth.allowedGroups must use the @guardian.co.uk domain.");
      }

      const deployToolsAccountId = StringParameter.fromStringParameterName(
        scope,
        "deploy-tools-account-id-parameter",
        NAMED_SSM_PARAMETER_PATHS.DeployToolsAccountId.path,
      );

      const cognitoAuthStage = props.googleAuth.cognitoAuthStage ?? "PROD";

      // See https://github.com/guardian/cognito-auth-lambdas for the source
      // code here. ARN format is:
      // arn:aws:lambda:aws-region:acct-id:function:helloworld.
      const gatekeeperFunctionArn = `arn:aws:lambda:eu-west-1:${deployToolsAccountId.stringValue}:function:deploy-${cognitoAuthStage}-gatekeeper-lambda`;

      // Note, handler and filename must match here:
      // https://github.com/guardian/cognito-auth-lambdas.
      const authLambda = new GuLambdaFunction(scope, "auth-lambda", {
        app: app,
        memorySize: 128,
        handler: "bootstrap",
        runtime: Runtime.PROVIDED_AL2023,
        fileName: `deploy/${cognitoAuthStage}/cognito-lambda/devx-cognito-lambda-amd64-v2.zip`,
        withoutFilePrefix: true,
        withoutArtifactUpload: true,
        bucketNamePath: NAMED_SSM_PARAMETER_PATHS.OrganisationDistributionBucket.path,
        architecture: Architecture.X86_64,
        environment: {
          ALLOWED_GROUPS: allowedGroups.join(","),
          GATEKEEPER_FUNCTION_ARN: gatekeeperFunctionArn,
        },
      });

      Tags.of(authLambda).add("Owner", "DevX");

      authLambda.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["lambda:InvokeFunction"],
          resources: [gatekeeperFunctionArn],
        }),
      );

      // Cognito user pool. We require both lambdas: pre-sign-up runs the first
      // time a user attempts to authenticate (before they exist in the User
      // Pool); pre-auth runs in subsequent authentication flows.
      const userPool = new UserPool(this, "user-pool", {
        lambdaTriggers: {
          preAuthentication: authLambda,
          preSignUp: authLambda,
        },
      });

      // These help ensure domain is deterministic but also unique. Key
      // assumption is that app/stack/stage combo are unique within Guardian.
      const domainPrefix = `com-gu-${app.toLowerCase()}-${scope.stage.toLowerCase()}`;

      const userPoolDomain = userPool.addDomain("domain", {
        cognitoDomain: {
          domainPrefix: getUserPoolDomainPrefix(domainPrefix),
        },
      });

      const clientId = SecretValue.secretsManager(credentialsSecretsManagerPath, { jsonField: "clientId" });
      const clientSecret = SecretValue.secretsManager(credentialsSecretsManagerPath, { jsonField: "clientSecret" });

      const userPoolIdp = new UserPoolIdentityProviderGoogle(scope, "google-idp", {
        userPool: userPool,
        clientId: clientId.toString(),
        clientSecretValue: clientSecret,
        attributeMapping: {
          email: ProviderAttribute.GOOGLE_EMAIL,
          givenName: ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: ProviderAttribute.GOOGLE_PICTURE,
          custom: {
            name: ProviderAttribute.GOOGLE_NAME,
          },
        },
        scopes: ["openid", "email", "profile"],
      });

      const userPoolClient = userPool.addClient("alb-client", {
        supportedIdentityProviders: [UserPoolClientIdentityProvider.GOOGLE],
        generateSecret: true,
        oAuth: {
          callbackUrls: [`https://${props.googleAuth.domain}/oauth2/idpresponse`],
        },

        // Note: id and access validity token validity cannot be less than one
        // hour (this is the cognito cookie duration). To quickly invalidate
        // credentials, disable the user in Cognito. It might be that we want to
        // parameterise these going forward, but that would require Infosec
        // discussion.
        idTokenValidity: Duration.hours(1),
        accessTokenValidity: Duration.hours(1),
        refreshTokenValidity: Duration.days(7),
      });

      userPoolClient.node.addDependency(userPoolIdp);

      if (props.ecsProps) {
        throw new Error("Using Google Auth with ECS is currently unsupported");
        // I think that the code here will probably work fine but it needs some dedicated testing.
        // For Google auth to work we need to 'authenticate-cognito' and then forward to a target group.
        // If we are operating with EC2 and ECS backends then this forwarded request could be sent to either backend.
        // Let's deploy this to a DevX service and check it's valid/works as expected before opening this up to other teams.
      }
      listener.addAction("CognitoAuth", {
        action: new AuthenticateCognitoAction({
          userPool: userPool,
          userPoolClient: userPoolClient,
          userPoolDomain: userPoolDomain,
          next: defaultAction,
          sessionTimeout: Duration.minutes(sessionTimeoutInMinutes),
        }),
      });

      // Need to give the ALB outbound access on 443 for the IdP endpoints.
      const idpEgressSecurityGroup = new GuHttpsEgressSecurityGroup(scope, "ldp-access", {
        app,
        vpc,
      });

      loadBalancer.addSecurityGroup(idpEgressSecurityGroup);
    }

    // Setup monitoring
    if (!monitoringConfiguration.noMonitoring) {
      const { http5xxAlarm, http4xxAlarm, snsTopicName } = monitoringConfiguration;

      if (http4xxAlarm) {
        new GuAlb4xxPercentageAlarm(scope, {
          app,
          loadBalancer,
          snsTopicName,
          ...http4xxAlarm,
        });
      }
      if (http5xxAlarm) {
        new GuAlb5xxPercentageAlarm(scope, {
          app,
          loadBalancer,
          snsTopicName,
          ...http5xxAlarm,
        });
      }
      if (monitoringConfiguration.unhealthyInstancesAlarm && targetGroups.ec2) {
        const { snsTopicName } = monitoringConfiguration;
        new GuUnhealthyInstancesAlarm(scope, {
          app,
          targetGroup: targetGroups.ec2,
          snsTopicName,
        });
      }
    }

    this.vpc = vpc;
    this.certificate = certificate;
    this.loadBalancer = loadBalancer;
    this.listener = listener;
    this.targetGroups = targetGroups;
  }
}

function configureListenerActions(
  targetGroups: TargetGroups,
  targetGroupWeights?: {
    ecs: number;
    ec2: number;
  },
): ListenerAction {
  // No ECS target, so forward all traffic to EC2
  if (targetGroups.ec2 && !targetGroups.ecs) {
    return ListenerAction.forward([targetGroups.ec2]);
  }

  // No EC2 target, so forward all traffic to ECS
  if (targetGroups.ecs && !targetGroups.ec2) {
    return ListenerAction.forward([targetGroups.ecs]);
  }

  if (targetGroups.ec2 && targetGroups.ecs) {
    if (!targetGroupWeights) {
      throw new Error("EC2 and ECS are both enabled but no target group weights were provided");
    }

    // An individual target can have a weight between 0 and 999. AWS will work out the relative percentage.
    const isBetween = (n: number, min: number, max: number): boolean => n >= min && n <= max;
    if (!isBetween(targetGroupWeights.ecs, 0, 999)) {
      throw new Error("targetGroupWeights.ecs must be between 0 and 999");
    }
    if (!isBetween(targetGroupWeights.ec2, 0, 999)) {
      throw new Error("targetGroupWeights.ec2 must be between 0 and 999");
    }

    return ListenerAction.weightedForward([
      { targetGroup: targetGroups.ec2, weight: targetGroupWeights.ec2 },
      { targetGroup: targetGroups.ecs, weight: targetGroupWeights.ecs },
    ]);
  } else {
    throw new Error("At least one of 'ec2Props' or 'ecsProps' must be specified");
  }
}
