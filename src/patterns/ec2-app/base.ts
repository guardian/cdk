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

export interface AccessLoggingProps {
  enabled: boolean;
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
  enabled: boolean;
  /**
   * Defaults to app name. That is, if your app runs as `<app>.service`
   * (e.g. `janus.service`), this will 'just work'.
   *
   * If it runs with a non-standard name, you will need to override the default
   * behavour. I.e. if your app is running as `some-different-name.service`, then
   * this prop should be set to `some-different-name`.
   */
  systemdUnitName?: string;
}

export interface Alarms {
  snsTopicName: string;
  http5xxAlarm: false | Http5xxAlarmProps;
  unhealthyInstancesAlarm: boolean;
  noMonitoring?: false;
}

/**
 * Configuration options for the [[`GuEc2App`]] pattern.
 *
 * To grant EC2 instances additional IAM permissions, use the `roleConfiguration` prop. For example,
 * to allow your app to write to DynamoDB:
 *
 * ```typescript
 * // other props
 * roleConfiguration: {
 *   additionalPolicies: [new GuDynamoDBWritePolicy(stack, "DynamoTable", { tableName: "my-dynamo-table" })],
 * }
 * ```
 *
 * To create alarms (recommended), use:
 * ```typescript
 * // other props
 * monitoringConfiguration: {
 *   snsTopicName: "alerts-topic-for-my-team",
 *   http5xxAlarm: {
 *     tolerated5xxPercentage: 1,
 *   },
 *   unhealthyInstancesAlarm: true,
 * }
 * ```
 *
 * To opt out of creating alarms, use:
 *```typescript
 * // other props
 * monitoringConfiguration: { noMonitoring: true }
 * ```
 *
 * To automatically ship application logs from `stdout` to ELK, use:
 *
 * ```typescript
 * {
 *   // other props
 *   applicationLogging: { enabled: true }
 * }
 * ```
 *
 * For more details on the requirements for application log shipping, see [[`ApplicationLoggingProps`]].
 *
 * To enable access logging for your load balancer, you can specify the prefix to write the logs to.
 * The S3 bucket used to hold these access logs must be specified in SSM at `/account/services/access-logging/bucket`
 * You must specify a region in your stack declaration if you are to use this prop, as specified here:
 * https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancer.html#logwbraccesswbrlogsbucket-prefix
 * For example:
 * ```typescript
 * {
 *   // other props
 *   accessLogging: {
 *     enabled: true,
 *     prefix: "my-application-logs"
 *   }
 * }
 *
 * If you would like to enable access logging at the root of the S3 bucket (ie without a prefix), you can omit the prefix
 * For example:
 * ```typescript
 * {
 *   // other props
 *   accessLogging: {
 *     enabled: true,
 *   }
 * }
 * ```
 */
export interface GuEc2AppProps extends AppIdentity {
  userData: GuUserDataProps | string;
  access: AppAccess;
  applicationPort: number;
  roleConfiguration?: GuInstanceRoleProps;
  monitoringConfiguration: Alarms | NoMonitoring;
  instanceType: InstanceType;
  applicationLogging?: ApplicationLoggingProps;
  accessLogging?: AccessLoggingProps;
  blockDevices?: BlockDevice[];
  scaling: GuAsgCapacity;
  certificateProps: GuDomainName;
  withoutImdsv2?: boolean;
  imageRecipe?: string;
  vpcOverride?: IVpc;
  deploymentSubnetsOverride?: ISubnet[];
}

function restrictedCidrRanges(ranges: IPeer[]) {
  return ranges.map((range) => ({
    range,
    port: Port.tcp(443),
    description: `Allow access on port 443 from ${range.uniqueId}`,
  }));
}

/**
 * Pattern which creates the resources needed to run an application on EC2 instances.
 * For convenience, you may wish to use [[`GuPlayApp`]] or [[`GuNodeApp`]], which extend this class.
 *
 * This pattern will grant your EC2 instances a number of commonly needed IAM permissions. For more information on
 * this, see [[`GuInstanceRole`]]. To add additional permissions to your EC2 instances, see [[`GuEc2AppProps`]].
 *
 * This pattern will automatically create security groups/rules which allow for:
 * 1. Incoming traffic over HTTPS (from the whole internet or from the specified CIDR ranges, depending on the
 * [[`AppAccess`]] specified).
 * 2. Communication between the load balancer and the EC2 instances over HTTP, via the specified application port.
 * 3. Outbound traffic from your EC2 instances over HTTPS (to enable communication with third-party APIs).
 *
 * Example usage for a public facing app (open to the internet):
 * ```typescript
 * new GuEc2App(stack, {
 *   applicationPort: 1234,
 *   app: "app-name",
 *   access: { scope: AccessScope.PUBLIC },
 *   instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
 *   certificateProps:{
 *     domainName: "prod-guardian.com",
 *   },
 *   monitoringConfiguration: {
 *     snsTopicName: "alerts-topic-for-my-team",
 *     http5xxAlarm: {
 *       tolerated5xxPercentage: 1,
 *     },
 *     unhealthyInstancesAlarm: true,
 *   },
 *   userData: {
 *     distributable: {
 *       fileName: "app-name.deb",
 *       executionStatement: `dpkg -i /app-name/app-name.deb`,
 *     }
 *   },
 * });
 * ```
 *
 * Example usage for an app which is restricted to specific CIDR ranges:
 * ```typescript
 * new GuEc2App(stack, {
 *   applicationPort: 1234,
 *   app: "app-name",
 *   access: {
 *     scope: AccessScope.RESTRICTED,
 *     cidrRanges: [Peer.ipv4("192.168.1.1/32"), Peer.ipv4("8.8.8.8/32")],
 *   },
 *   instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
 *   certificateProps:{
 *     domainName: "prod-guardian.com",
 *   },
 *   monitoringConfiguration: {
 *     snsTopicName: "alerts-topic-for-my-team",
 *     http5xxAlarm: {
 *       tolerated5xxPercentage: 1,
 *     },
 *     unhealthyInstancesAlarm: true,
 *   }
 *   userData: {
 *     distributable: {
 *       fileName: "app-name.deb",
 *       executionStatement: `dpkg -i /app-name/app-name.deb`,
 *     }
 *   },
 * });
 * ```
 *
 * ### Varying values by stage
 *
 * There are times when you want a resource's configuration to be stage aware,
 * for example the number of instances in an ASG.
 *
 * To do this, we can use a simple ternary:
 * ```typescript
 * new GuEc2App(this, {
 *   // other required properties
 *   scaling: this.stage === "PROD" ? { minimumInstances: 6 } : { minimumInstances: 1 }
 * });
 * ```
 *
 * If multiple properties need to be stage aware, consider encoding this into the `props` of the calling class:
 *
 * ```typescript
 * export interface MyAppProps extends GuStackProps {
 *   domainName: string;
 *   scaling: GuAsgCapacity;
 *   monitoringConfiguration: Alarms | NoMonitoring;
 * }
 *
 * export class MyApp extends GuStack {
 *   private static app = "cdk-playground";
 *
 *   constructor(scope: App, id: string, props: MyAppProps) {
 *     const { stage, domainName, scaling, monitoringConfiguration } = props;
 *
 *     super(scope, id, props);
 *
 *     new GuPlayApp(this, {
 *       app: "my-app",
 *       instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
 *       access: { scope: AccessScope.PUBLIC },
 *       userData: {
 *         distributable: {
 *           fileName: `my-app.deb`,
 *           executionStatement: `dpkg -i /my-app/my-app.deb`,
 *         },
 *       },
 *       certificateProps: {
 *         domainName,
 *       },
 *       monitoringConfiguration,
 *       scaling,
 *     });
 *   }
 * }
 *
 * new MyApp(app, "MyApp-CODE", {
 *   stage: "CODE",
 *   domainName: "my-app.code.dev-gutools.co.uk",
 *   scaling: { minimumInstances: 1 },
 *   monitoringConfiguration: { noMonitoring: true },
 * });
 *
 * new MyApp(app, "MyApp-PROD", {
 *   stage: "PROD",
 *   domainName: "my-app.prod.gutools.co.uk",
 *   scaling: { minimumInstances: 6 },
 *   monitoringConfiguration: {
 *     // config to enable alarms in PROD
 *   },
 * });
 * ```
 *
 *
 * ### Customising the infrastructure generated by this pattern
 *
 * Although we allow users to customise many aspects of their infrastructure via [[`GuEc2AppProps`]], it's possible
 * that there are less common use-cases which are currently unsupported via the API. In these circumstances escape
 * hatches can be used to override specific resources in the stack.
 *
 * In order to do this:
 *
 * 1. Create desired resource using Guardian or AWS constructs, for example:
 * ```typescript
 * const sg = new GuSecurityGroup(
 *   // custom parameters
 * );
 * ```
 * 2. Access the CloudFormation version of the resource that you wish to customise, for example:
 * ```typescript
 * const pattern = new GuEc2App(
 *   // all parameters
 * )
 * const cfnLb = pattern.loadBalancer.node.defaultChild as CfnLoadBalancer;
 * ```
 * 3. Replace the resource generated by the pattern with your bespoke resource, for example:
 * ```typescript
 * cfnLb.securityGroups = [sg.securityGroupId];
 * ```
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
  public readonly certificate: GuCertificate;
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
      certificateProps: { domainName, hostedZoneId },
      instanceType,
      monitoringConfiguration,
      roleConfiguration = { withoutLogShipping: false, additionalPolicies: [] },
      scaling: { minimumInstances, maximumInstances = minimumInstances * 2 },
      userData,
      withoutImdsv2,
      imageRecipe,
      vpcOverride,
      deploymentSubnetsOverride,
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

    const vpc: IVpc = vpcOverride ?? GuVpc.fromIdParameter(scope, AppIdentity.suffixText({ app }, "VPC"));
    const privateSubnets =
      deploymentSubnetsOverride ?? GuVpc.subnetsFromParameter(scope, { type: SubnetType.PRIVATE, app });

    AppAccess.validate(access);

    const certificate = new GuCertificate(scope, {
      app,
      domainName,
      hostedZoneId,
    });

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

    // We are selectively tagging the ASG so that we can expose the number of stacks using this pattern
    //  based on which autoscaling groups possess this tag. It may become useful or necessary to tag all resources in the future,
    //  but we have decided that this is sufficient for now.
    // TODO: Do we need to tag all resources with this value? What would the use-cases be?
    Tags.of(autoScalingGroup).add(MetadataKeys.PATTERN_NAME, this.constructor.name, { applyToLaunchedInstances: true });

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
        subnets:
          access.scope === AccessScope.INTERNAL
            ? privateSubnets
            : GuVpc.subnetsFromParameter(scope, { type: SubnetType.PUBLIC, app }),
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
      open: access.scope === AccessScope.PUBLIC,
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
