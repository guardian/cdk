/* eslint "@guardian/tsdoc-required/tsdoc-required": 2 -- to begin rolling this out for public APIs. */
import type { Duration } from "aws-cdk-lib";
import type { BlockDevice, UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";
import type { InstanceType, ISubnet, IVpc, UserData } from "aws-cdk-lib/aws-ec2";
import type { HealthCheck as ALBHealthCheck } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type { GuCertificate } from "../../constructs/acm";
import type { GuAutoScalingGroup, GuUserDataProps } from "../../constructs/autoscaling";
import type { Http4xxAlarmProps, Http5xxAlarmProps, NoMonitoring } from "../../constructs/cloudwatch";
import type { AppIdentity, GuStack } from "../../constructs/core";
import type { GuInstanceRoleProps } from "../../constructs/iam";
import type {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
} from "../../constructs/loadbalancing";
import type { WafProps } from "../../constructs/loadbalancing";
import { GuLoadBalancedAppExperimental } from "../../experimental/patterns/gu-load-balanced-app";
import type { AppAccess } from "../../types";
import type { GuAsgCapacity, GuDomainName } from "../../types";
import type { AmigoProps } from "../../types/amigo";

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
   * Enable access logging for this load balancer.
   * Access logs are written to an S3 bucket within your AWS account.
   * The bucket is created by {@link https://github.com/guardian/aws-account-setup}.
   * The logs are queryable via the `gucdk_access_logs` Athena database.
   *
   * @defaultValue true
   */
  withAccessLogging?: boolean;

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

/**
 * Pattern which creates the resources needed to run an application on EC2
 * behind a load balancer. For convenience, you may wish to use [[`GuPlayApp`]]
 * or [[`GuNodeApp`]], which extend this class.
 *
 * See props for further details.
 */
export class GuEc2App {
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
      withAccessLogging,
      app,
      applicationPort,
      certificateProps,
      googleAuth,
      healthcheck,
      monitoringConfiguration,
      vpc,
      privateSubnets,
      publicSubnets,
      waf,
      applicationLogging,
      blockDevices,
      instanceType,
      roleConfiguration,
      scaling,
      userData,
      imageRecipe,
      instanceMetadataHopLimit,
      updatePolicy,
      defaultInstanceWarmup,
      instanceMetricGranularity,
    } = props;
    const pattern = new GuLoadBalancedAppExperimental(scope, {
      access,
      withAccessLogging,
      app,
      applicationPort,
      certificateProps,
      googleAuth,
      healthcheck,
      monitoringConfiguration,
      vpc,
      privateSubnets,
      publicSubnets,
      waf,
      ec2Props: {
        applicationLogging,
        blockDevices,
        instanceType,
        roleConfiguration,
        scaling,
        userData,
        imageRecipe,
        instanceMetadataHopLimit,
        updatePolicy,
        defaultInstanceWarmup,
        instanceMetricGranularity,
      },
    });

    this.vpc = pattern.vpc;
    this.certificate = pattern.certificate;
    this.loadBalancer = pattern.loadBalancer;
    this.autoScalingGroup = pattern.autoScalingGroup!;
    this.listener = pattern.listener;
    this.targetGroup = pattern.targetGroups.ec2!;
  }
}
