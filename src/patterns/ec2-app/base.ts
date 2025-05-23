/* eslint "@guardian/tsdoc-required/tsdoc-required": 2 -- to begin rolling this out for public APIs. */
import { Duration, SecretValue, Tags } from "aws-cdk-lib";
import type { BlockDevice, UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";
import { AdditionalHealthCheckType, HealthChecks } from "aws-cdk-lib/aws-autoscaling";
import {
  ProviderAttribute,
  UserPool,
  UserPoolClientIdentityProvider,
  UserPoolIdentityProviderGoogle,
} from "aws-cdk-lib/aws-cognito";
import type { InstanceType, IPeer, ISubnet, IVpc } from "aws-cdk-lib/aws-ec2";
import { Port, UserData } from "aws-cdk-lib/aws-ec2";
import type { HealthCheck as ALBHealthCheck } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ApplicationProtocol, ListenerAction } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { AuthenticateCognitoAction } from "aws-cdk-lib/aws-elasticloadbalancingv2-actions";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { AccessScope, MetadataKeys, NAMED_SSM_PARAMETER_PATHS } from "../../constants";
import { GuCertificate } from "../../constructs/acm";
import type { GuUserDataProps } from "../../constructs/autoscaling";
import { GuAutoScalingGroup, GuUserData } from "../../constructs/autoscaling";
import type { Http4xxAlarmProps, Http5xxAlarmProps, NoMonitoring } from "../../constructs/cloudwatch";
import {
  GuAlb4xxPercentageAlarm,
  GuAlb5xxPercentageAlarm,
  GuUnhealthyInstancesAlarm,
} from "../../constructs/cloudwatch";
import type { GuStack } from "../../constructs/core";
import { AppIdentity, GuAccessLoggingBucketParameter, GuLoggingStreamNameParameter } from "../../constructs/core";
import { GuHttpsEgressSecurityGroup, GuSecurityGroup, GuVpc, SubnetType } from "../../constructs/ec2";
import type { GuInstanceRoleProps } from "../../constructs/iam";
import { GuGetPrivateConfigPolicy, GuInstanceRole } from "../../constructs/iam";
import { GuLambdaFunction } from "../../constructs/lambda";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
} from "../../constructs/loadbalancing";
import { AppAccess } from "../../types";
import type { GuAsgCapacity, GuDomainName } from "../../types";
import type { AmigoProps } from "../../types/amigo";
import { getUserPoolDomainPrefix } from "../../utils/cognito/cognito";

export interface AccessLoggingProps {
  /**
   * Enable (load balancer) access logs.
   *
   * Note, you will need to specify a region in your stack declaration to use
   * this.
   * See`https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancer.html#logwbraccesswbrlogsbucket-prefix`
   */
  enabled: boolean;
  /**
   * S3 prefix for the logs.
   *
   * @defaultValue no prefix
   */
  prefix?: string;
}

/**
 * To ship your application logs to ELK automatically, you must:
 *
 * 1. Set the `enabled` flag to true
 * 2. Include the `cdk-base` Amigo role in your AMI
 * 3. Log to `journald`. We recommend doing this by logging to `stdout` and
 * using `systemd` to start your app
 * 4. Confirm that your [[`systemdUnitName`]] is configured properly.
 *
 * Unless you have explicitly opted-out, appropriate IAM permissions for logging
 * to Kinesis will be configured automatically via the [[`GuEc2App`]] pattern.
 */
export interface ApplicationLoggingProps {
  /**
   * Enables forwarding of application logs to the Guardian ELK stack.
   *
   * Note, to work, you will need to also do the following non-CDK things:
   *
   * 1. Include the `cdk-base` Amigo role in your AMI.
   * 2. Log to `journald`. We recommend doing this by logging to `stdout` and
   *    using `systemd` to start your app
   * 3. Confirm that your [[`systemdUnitName`]] is configured properly.
   *
   * Unless you have explicitly opted-out, appropriate IAM permissions for
   * logging to Kinesis will be configured automatically via the [[`GuEc2App`]]
   * pattern.
   *
   * @see https://github.com/guardian/amigo/tree/main/roles/cdk-base
   */
  enabled: boolean;
  /**
   * This needs to match the name of your SystemD unit.
   *
   * If your systemd unit is not `<app>.service` set this value.
   *
   * @defaultValue `<app>.service`
   */
  systemdUnitName?: string;
}

/**
 * @privateRemarks we should rename this to AlarmsProps.
 */
export interface Alarms {
  /**
   * Name of the target (SNS Topic) for alarm notifications.
   */
  snsTopicName: string;
  /**
   * Enable the 5xx alarm with settings.
   */
  http5xxAlarm: false | Http5xxAlarmProps;
  /**
   * Enable the 4xx alarm with settings.
   */
  http4xxAlarm?: false | Http4xxAlarmProps;
  /**
   * Enable the unhealthy instances alarm.
   */
  unhealthyInstancesAlarm: boolean;
  /**
   * Internal flag - users of this library should ignore this setting.
   */
  noMonitoring?: false;
}

export interface GuEc2AppProps extends AppIdentity {
  /**
   * User data for the autoscaling group.
   */
  userData: GuUserDataProps | UserData;
  /**
   * Network access restrictions for your load balancer.
   *
   * Note, this merely provides defence in depth; you should, for example, limit
   * access to the VPN and then treat that as sufficient. Instead, use Google
   * Auth for human access, or a suitable machine auth mechanism.
   */
  access: AppAccess;
  /**
   * The port your application runs on.
   */
  applicationPort: number;
  /**
   * Configure IAM roles for autoscaling group EC2 instances.
   */
  roleConfiguration?: GuInstanceRoleProps;
  /**
   * Enable and configure alarms.
   */
  monitoringConfiguration: Alarms | NoMonitoring;
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
   * Enable and configures access logs.
   */
  accessLogging?: AccessLoggingProps;
  /**
   * Add block devices (additional storage).
   */
  blockDevices?: BlockDevice[];
  /**
   * Autoscaling group min and max sizes.
   */
  scaling: GuAsgCapacity;
  /**
   * Specify certificate for the load balancer.
   */
  certificateProps?: GuDomainName;

  /**
   * Configure AMIgo image recipe. This is only necessary if you are using GuCDK to generate your riff-raff.yaml file.
   */
  imageRecipe?: string | AmigoProps;
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
   * Specify private subnets if using a non-default VPC or (generally
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
   * Specify custom healthcheck
   */
  healthcheck?: ALBHealthCheck;

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
}

function restrictedCidrRanges(ranges: IPeer[]) {
  return ranges.map((range) => ({
    range,
    port: Port.tcp(443),
    description: `Allow access on port 443 from ${range.uniqueId}`,
  }));
}

/**
 * Pattern which creates the resources needed to run an application on EC2
 * behind a load balancer. For convenience, you may wish to use [[`GuPlayApp`]]
 * or [[`GuNodeApp`]], which extend this class.
 *
 * See props for further details.
 */
export class GuEc2App extends Construct {
  /*
   * These are public for now, as this allows users to
   * modify these constructs as desired to fit their
   * specific needs.
   * In the future, we might build functionality to better enable users
   * to access in-pattern constructs, but this would allow teams to be unblocked
   * in the short term.
   * */
  public readonly vpc: IVpc;
  public readonly certificate?: GuCertificate;
  public readonly loadBalancer: GuApplicationLoadBalancer;
  public readonly autoScalingGroup: GuAutoScalingGroup;
  public readonly listener: GuHttpsApplicationListener;
  public readonly targetGroup: GuApplicationTargetGroup;

  constructor(scope: GuStack, props: GuEc2AppProps) {
    const {
      access,
      accessLogging = { enabled: false },
      app,
      // We should update this default once a significant number of apps have migrated to devx-logs
      applicationLogging = { enabled: false },
      applicationPort,
      blockDevices,
      certificateProps,
      instanceType,
      monitoringConfiguration,
      roleConfiguration = { withoutLogShipping: false, additionalPolicies: [] },
      scaling: { minimumInstances, maximumInstances = minimumInstances * 2 },
      userData: userDataLike,
      imageRecipe,
      vpc = GuVpc.fromIdParameter(scope, AppIdentity.suffixText({ app }, "VPC")),
      privateSubnets = GuVpc.subnetsFromParameter(scope, { type: SubnetType.PRIVATE, app }),
      publicSubnets = GuVpc.subnetsFromParameter(scope, { type: SubnetType.PUBLIC, app }),
      instanceMetadataHopLimit,
      updatePolicy,
      defaultInstanceWarmup,
      instanceMetricGranularity,
    } = props;

    super(scope, app); // The assumption is `app` is unique

    // We should really prevent users from doing this via the type system,
    // but that requires a breaking change to the API
    if (applicationLogging.enabled && roleConfiguration.withoutLogShipping) {
      throw new Error(
        "Application logging has been enabled (via the `applicationLogging` prop) but your `roleConfiguration` sets " +
          "`withoutLogShipping` to true. Please turn off application logging or remove `withoutLogShipping`",
      );
    }

    const userData = userDataLike instanceof UserData ? userDataLike : new GuUserData(scope, { ...userDataLike, app });

    AppAccess.validate(access);

    const certificate =
      typeof certificateProps !== "undefined"
        ? new GuCertificate(scope, {
            app,
            domainName: certificateProps.domainName,
            hostedZoneId: certificateProps.hostedZoneId,
          })
        : undefined;

    const maybePrivateConfigPolicy =
      userData instanceof GuUserData && userData.configuration
        ? [new GuGetPrivateConfigPolicy(scope, "GetPrivateConfigFromS3Policy", userData.configuration)]
        : [];

    const mergedRoleConfiguration: GuInstanceRoleProps = {
      withoutLogShipping: roleConfiguration.withoutLogShipping,
      additionalPolicies: maybePrivateConfigPolicy.concat(roleConfiguration.additionalPolicies ?? []),
    };

    const autoScalingGroup = new GuAutoScalingGroup(scope, "AutoScalingGroup", {
      app,
      vpc,
      instanceType,
      minimumInstances,
      maximumInstances,
      role: new GuInstanceRole(scope, { app, ...mergedRoleConfiguration }),

      // TODO should this be defaulted at pattern or construct level?
      healthChecks: HealthChecks.withAdditionalChecks({
        additionalTypes: [AdditionalHealthCheckType.ELB],
        gracePeriod: Duration.minutes(2),
      }),

      userData: userData instanceof GuUserData ? userData.userData : userData,
      vpcSubnets: { subnets: privateSubnets },
      ...(blockDevices && { blockDevices }),
      imageRecipe,
      httpPutResponseHopLimit: instanceMetadataHopLimit,
      updatePolicy,
      defaultInstanceWarmup,
      instanceMetricGranularity,
    });

    // This allows automatic shipping of instance Cloud Init logs when using the
    // `cdk-base` Amigo role on your AMI.
    Tags.of(autoScalingGroup).add(
      MetadataKeys.LOG_KINESIS_STREAM_NAME,
      GuLoggingStreamNameParameter.getInstance(scope).valueAsString,
    );

    if (applicationLogging.enabled) {
      // This allows automatic shipping of application logs when using the
      // `cdk-base` Amigo role on your AMI.
      Tags.of(autoScalingGroup).add(
        MetadataKeys.SYSTEMD_UNIT,
        applicationLogging.systemdUnitName ? `${applicationLogging.systemdUnitName}.service` : `${app}.service`,
      );
    }

    const loadBalancer = new GuApplicationLoadBalancer(scope, "LoadBalancer", {
      app,
      vpc,
      // Setting internetFacing to true does not necessarily allow public access to the load balancer itself. That is handled by the listener's `open` prop.
      internetFacing: access.scope !== AccessScope.INTERNAL,
      vpcSubnets: {
        subnets: access.scope === AccessScope.INTERNAL ? privateSubnets : publicSubnets,
      },
    });

    if (accessLogging.enabled) {
      const accessLoggingBucket = GuAccessLoggingBucketParameter.getInstance(scope);

      loadBalancer.logAccessLogs(
        Bucket.fromBucketName(
          scope,
          AppIdentity.suffixText(props, "AccessLoggingBucket"),
          accessLoggingBucket.valueAsString,
        ),
        accessLogging.prefix,
      );
    }

    const targetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
      app,
      vpc,
      protocol: ApplicationProtocol.HTTP,
      targets: [autoScalingGroup],
      port: applicationPort,
      healthCheck: props.healthcheck,
    });

    const listener = new GuHttpsApplicationListener(scope, "Listener", {
      app,
      loadBalancer,
      certificate,
      targetGroup,
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

    if (!monitoringConfiguration.noMonitoring) {
      const { http5xxAlarm, http4xxAlarm, snsTopicName, unhealthyInstancesAlarm } = monitoringConfiguration;

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
      if (unhealthyInstancesAlarm) {
        new GuUnhealthyInstancesAlarm(scope, {
          app,
          targetGroup,
          snsTopicName,
        });
      }
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
        runtime: Runtime.PROVIDED_AL2,
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

      listener.addAction("CognitoAuth", {
        action: new AuthenticateCognitoAction({
          userPool: userPool,
          userPoolClient: userPoolClient,
          userPoolDomain: userPoolDomain,
          next: ListenerAction.forward([targetGroup]),
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

    this.vpc = vpc;
    this.certificate = certificate;
    this.loadBalancer = loadBalancer;
    this.autoScalingGroup = autoScalingGroup;
    this.listener = listener;
    this.targetGroup = targetGroup;
  }
}
