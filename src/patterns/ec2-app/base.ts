/* eslint "@guardian/tsdoc-required/tsdoc-required": 2 -- to begin rolling this out for public APIs. */
import {Duration, Tags} from "aws-cdk-lib";
import type {BlockDevice} from "aws-cdk-lib/aws-autoscaling";
import {HealthCheck} from "aws-cdk-lib/aws-autoscaling";
import type {InstanceType, IVpc} from "aws-cdk-lib/aws-ec2";
import {Construct} from "constructs";
import {MetadataKeys} from "../../constants";
import {GuCertificate} from "../../constructs/acm";
import type {GuUserDataProps} from "../../constructs/autoscaling";
import {GuAutoScalingGroup, GuUserData} from "../../constructs/autoscaling";
import type {Http5xxAlarmProps} from "../../constructs/cloudwatch";
import type {GuStack} from "../../constructs/core";
import {AppIdentity, GuLoggingStreamNameParameter} from "../../constructs/core";
import {GuVpc, SubnetType} from "../../constructs/ec2";
import type {GuInstanceRoleProps} from "../../constructs/iam";
import {GuGetPrivateConfigPolicy, GuInstanceRole} from "../../constructs/iam";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
} from "../../constructs/loadbalancing";
import type {GuAsgCapacity} from "../../types";
import {AppAccess} from "../../types";
import type {AmigoProps} from "../../types/amigo";
import {GuLoadBalancingComponents, GuLoadBalancingComponentsProps} from "../load-balancer/load-balancer";
import {ApplicationProtocol} from "aws-cdk-lib/aws-elasticloadbalancingv2";

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
   * Enable the unhealthy instances alarm.
   */
  unhealthyInstancesAlarm: boolean;
  /**
   * Internal flag - users of this library should ignore this setting.
   */
  noMonitoring?: false;
}

export interface GuEc2AppProps extends GuLoadBalancingComponentsProps {
  /**
   * User data for the autoscaling group.
   */
  userData: GuUserDataProps | string;
  /**
   * Configure IAM roles for autoscaling group EC2 instances.
   */
  roleConfiguration?: GuInstanceRoleProps;
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
   * Disable imdsv2. Most of the time you should not set this.
   *
   * @see https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
   */
  withoutImdsv2?: boolean;
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
      app,
      // We should update this default once a significant number of apps have migrated to devx-logs
      applicationLogging = {enabled: false},
      blockDevices,
      instanceType,
      roleConfiguration = {withoutLogShipping: false, additionalPolicies: []},
      scaling: {minimumInstances, maximumInstances = minimumInstances * 2},
      userData,
      withoutImdsv2,
      imageRecipe,
      vpc = GuVpc.fromIdParameter(scope, AppIdentity.suffixText({app}, "VPC")),
      privateSubnets = GuVpc.subnetsFromParameter(scope, {type: SubnetType.PRIVATE, app}),
      instanceMetadataHopLimit,
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

    AppAccess.validate(access);

    const maybePrivateConfigPolicy =
      typeof userData !== "string" && userData.configuration
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
      withoutImdsv2,
      role: new GuInstanceRole(scope, {app, ...mergedRoleConfiguration}),
      healthCheck: HealthCheck.elb({grace: Duration.minutes(2)}), // should this be defaulted at pattern or construct level?
      userData: typeof userData !== "string" ? new GuUserData(scope, {app, ...userData}).userData : userData,
      vpcSubnets: {subnets: privateSubnets},
      ...(blockDevices && {blockDevices}),
      imageRecipe,
      httpPutResponseHopLimit: instanceMetadataHopLimit,
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

    const loadBalancer = new GuLoadBalancingComponents(scope, {...props, target: autoScalingGroup, protocol: ApplicationProtocol.HTTP})

    this.vpc = vpc;
    this.certificate = loadBalancer.certificate;
    this.loadBalancer = loadBalancer.loadBalancer;
    this.autoScalingGroup = autoScalingGroup;
    this.listener = loadBalancer.listener;
    this.targetGroup = loadBalancer.targetGroup;
  }
}
