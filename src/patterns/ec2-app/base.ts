import { Duration, Tags } from "aws-cdk-lib";
import type { BlockDevice } from "aws-cdk-lib/aws-autoscaling";
import { HealthCheck } from "aws-cdk-lib/aws-autoscaling";
import type { InstanceType, IPeer, ISubnet, IVpc } from "aws-cdk-lib/aws-ec2";
import { Port } from "aws-cdk-lib/aws-ec2";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { AccessScope, MetadataKeys, NAMED_SSM_PARAMETER_PATHS } from "../../constants";
import { GuCertificate } from "../../constructs/acm";
import type { GuUserDataProps } from "../../constructs/autoscaling";
import { GuAutoScalingGroup, GuUserData } from "../../constructs/autoscaling";
import type { Http5xxAlarmProps, NoMonitoring } from "../../constructs/cloudwatch";
import { GuAlb5xxPercentageAlarm, GuUnhealthyInstancesAlarm } from "../../constructs/cloudwatch";
import type { GuStack } from "../../constructs/core";
import { AppIdentity, GuLoggingStreamNameParameter, GuStringParameter } from "../../constructs/core";
import { GuSecurityGroup, GuVpc, SubnetType } from "../../constructs/ec2";
import type { GuInstanceRoleProps } from "../../constructs/iam";
import { GuGetPrivateConfigPolicy, GuInstanceRole } from "../../constructs/iam";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
} from "../../constructs/loadbalancing";
import { AppAccess } from "../../types";
import type { GuAsgCapacity, GuDomainName } from "../../types";
import type { AmigoProps } from "../../types/amigo";

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

export interface GuEc2AppProps extends AppIdentity {
  /**
   * User data for the autoscaling group.
   */
  userData: GuUserDataProps | string;
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
   * Disable imdsv2. Most of the time you should not set this.
   *
   * @see https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
   */
  withoutImdsv2?: boolean;
  /**
   * Configure Amigo image recipe.
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
      userData,
      withoutImdsv2,
      imageRecipe,
      vpc = GuVpc.fromIdParameter(scope, AppIdentity.suffixText({ app }, "VPC")),
      privateSubnets = GuVpc.subnetsFromParameter(scope, { type: SubnetType.PRIVATE, app }),
      publicSubnets = GuVpc.subnetsFromParameter(scope, { type: SubnetType.PUBLIC, app }),
    } = props;

    super(scope, app); // The assumption is `app` is unique

    // We should really prevent users from doing this via the type system,
    // but that requires a breaking change to the API
    if (applicationLogging.enabled && roleConfiguration.withoutLogShipping) {
      throw new Error(
        "Application logging has been enabled (via the `applicationLogging` prop) but your `roleConfiguration` sets " +
          "`withoutLogShipping` to true. Please turn off application logging or remove `withoutLogShipping`"
      );
    }

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
      role: new GuInstanceRole(scope, { app, ...mergedRoleConfiguration }),
      healthCheck: HealthCheck.elb({ grace: Duration.minutes(2) }), // should this be defaulted at pattern or construct level?
      userData: typeof userData !== "string" ? new GuUserData(scope, { app, ...userData }).userData : userData,
      vpcSubnets: { subnets: privateSubnets },
      ...(blockDevices && { blockDevices }),
      imageRecipe,
    });

    // This allows automatic shipping of instance Cloud Init logs when using the
    // `cdk-base` Amigo role on your AMI.
    Tags.of(autoScalingGroup).add(
      MetadataKeys.LOG_KINESIS_STREAM_NAME,
      GuLoggingStreamNameParameter.getInstance(scope).valueAsString
    );

    if (applicationLogging.enabled) {
      // This allows automatic shipping of application logs when using the
      // `cdk-base` Amigo role on your AMI.
      Tags.of(autoScalingGroup).add(
        MetadataKeys.SYSTEMD_UNIT,
        applicationLogging.systemdUnitName ? `${applicationLogging.systemdUnitName}.service` : `${app}.service`
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
      const accessLoggingBucket = new GuStringParameter(scope, "AccessLoggingBucket", {
        description: NAMED_SSM_PARAMETER_PATHS.AccessLoggingBucket.description,
        default: NAMED_SSM_PARAMETER_PATHS.AccessLoggingBucket.path,
        fromSSM: true,
      });

      loadBalancer.logAccessLogs(
        Bucket.fromBucketName(
          scope,
          AppIdentity.suffixText(props, "AccessLoggingBucket"),
          accessLoggingBucket.valueAsString
        ),
        accessLogging.prefix
      );
    }

    const targetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
      app,
      vpc,
      protocol: ApplicationProtocol.HTTP,
      targets: [autoScalingGroup],
      port: applicationPort,
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
        })
      );
    }

    if (!monitoringConfiguration.noMonitoring) {
      const { http5xxAlarm, snsTopicName, unhealthyInstancesAlarm } = monitoringConfiguration;

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

    this.vpc = vpc;
    this.certificate = certificate;
    this.loadBalancer = loadBalancer;
    this.autoScalingGroup = autoScalingGroup;
    this.listener = listener;
    this.targetGroup = targetGroup;
  }
}
