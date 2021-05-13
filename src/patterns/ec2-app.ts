import { HealthCheck } from "@aws-cdk/aws-autoscaling";
import { Port } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Bucket } from "@aws-cdk/aws-s3";
import { Duration } from "@aws-cdk/core";
import { GuCertificate } from "../constructs/acm";
import { GuAutoScalingGroup, GuUserData } from "../constructs/autoscaling";
import { Gu5xxPercentageAlarm } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import { GuSSMParameter } from "../constructs/core";
import { AppIdentity } from "../constructs/core/identity";
import { GuSecurityGroup, GuVpc, SubnetType } from "../constructs/ec2";
import { GuGetPrivateConfigPolicy, GuInstanceRole } from "../constructs/iam";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
} from "../constructs/loadbalancing";
import type { Stage } from "../constants";
import type { GuCertificateProps } from "../constructs/acm";
import type { GuAsgCapacityProps, GuUserDataProps } from "../constructs/autoscaling";
import type { Gu5xxPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import type { GuInstanceRoleProps } from "../constructs/iam";
import type { IPeer } from "@aws-cdk/aws-ec2";

export enum AccessScope {
  PUBLIC,
  RESTRICTED,
}

export interface Access {
  scope: AccessScope;
}

/**
 * For when you want your application to be accessible to the world (0.0.0.0/0).
 * Your application load balancer will have a public IP address that can be reached by anyone,
 * so only use if you are aware and happy with the consequences!
 *
 * Example usage:
 * ```typescript
 * { scope: AccessScope.PUBLIC }
 * ```
 */
export interface PublicAccess extends Access {
  scope: AccessScope.PUBLIC;
}

/**
 * For when you want to restrict your application's access to a list of CIDR ranges.
 *
 * Example usage:
 * ```typescript
 * {
 *   scope: AccessScope.RESTRICTED,
 *   cidrRanges: [Peer.ipv4("192.168.1.1/32"), Peer.ipv4("8.8.8.8/32")]
 * }
 * ```
 */
export interface RestrictedAccess extends Access {
  scope: AccessScope.RESTRICTED;
  cidrRanges: IPeer[];
}

export type AppAccess = PublicAccess | RestrictedAccess;

export interface AccessLoggingProps {
  // This provides a hint & incentive to users to use a recommended path
  bucketSSMPath: string | "/account/services/access-logging/bucket";
  prefix?: string;
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
 * To create an alarm which is triggered whenever the percentage of requests with a 5xx response code exceeds
 * the specified threshold, use:
 * ```typescript
 * // other props
 * monitoringConfiguration: {
 *   tolerated5xxPercentage: 1,
 *   snsTopicName: "alerts-topic-for-my-team",
 * }
 * ```
 *
 * To opt out of creating alarms, use:
 *```typescript
 * // other props
 * monitoringConfiguration: { noMonitoring: true }
 * ```
 *
 * To configure your scaling policies for AutoScalingGroups, use the `scaling` prop. For example:
 * ```typescript
 * // other props
 * scaling: {
 *   CODE: { minimumInstances: 3 },
 *   PROD: { minimumInstances: 5, maximumInstances: 12 }
 * }
 * ```
 *
 * To enable access logging for your load balancer, you can specify the bucket and prefix to write the logs to.
 * You must specify a region in your stack declaration if you are to use this prop, as specified here:
 * https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-elasticloadbalancingv2.ApplicationLoadBalancer.html#logwbraccesswbrlogsbucket-prefix
 * For example:
 * ```typescript
 * {
 *   // other props
 *   accessLogging: {
 *     // Recommended path: `/account/services/access-logging/bucket`
 *     bucket: "/SSM/PATH/TO/ACCESS_LOGGING_BUCKET",
 *     prefix: "my-application-logs"
 *   }
 * }
 * ```
 */
export interface GuEc2AppProps extends AppIdentity {
  userData: GuUserDataProps | string;
  access: AppAccess;
  applicationPort: number;
  certificateProps: GuCertificateProps;
  roleConfiguration?: GuInstanceRoleProps;
  monitoringConfiguration: NoMonitoring | Gu5xxPercentageMonitoringProps;
  scaling?: {
    [Stage.CODE]: GuAsgCapacityProps;
    [Stage.PROD]: GuAsgCapacityProps;
  };
  accessLogging?: AccessLoggingProps;
}

interface GuMaybePortProps extends Omit<GuEc2AppProps, "applicationPort"> {
  applicationPort?: number;
}

export enum GuApplicationPorts {
  Node = 3000,
  Play = 9000,
}

const OpenApplicationCidrError: Error =
  Error(`Your list of CIDR ranges includes 0.0.0.0/0, meaning all other ranges specified are unnecessary as
your application is open to the world. Please either remove the open CIDR range or use the PUBLIC access scope.`);

function validateRestrictedCidrRanges(access: RestrictedAccess) {
  const openToWorld = access.cidrRanges.map((range) => range.uniqueId).includes("0.0.0.0/0");
  if (openToWorld) throw OpenApplicationCidrError;
}

function restrictedCidrRanges(ranges: IPeer[]) {
  return ranges.map((range) => ({
    range,
    port: Port.tcp(443),
    description: `Allow access on port 443 from ${range.uniqueId}`,
  }));
}

/**
 * Pattern which creates all of the resources needed to run an application on EC2 instances.
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
 * The pattern will run a single EC2 instance in `CODE` and three EC2 instances in `PROD`.
 *
 * Example usage for a public facing app (open to the internet):
 * ```typescript
 * new GuEc2App(stack, {
 *   applicationPort: 1234,
 *   app: "app-name",
 *   access: { scope: AccessScope.PUBLIC },
 *   certificateProps:{
 *     [Stage.CODE]: {
 *       domainName: "code-guardian.com",
 *       hostedZoneId: "id123",
 *     },
 *     [Stage.PROD]: {
 *       domainName: "prod-guardian.com",
 *       hostedZoneId: "id124",
 *     },
 *   },
 *   monitoringConfiguration: {
 *     tolerated5xxPercentage: 1,
 *     snsTopicName: "alerts-topic-for-my-team",
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
 *   certificateProps:{
 *     [Stage.CODE]: {
 *       domainName: "code-guardian.com",
 *       hostedZoneId: "id123",
 *     },
 *     [Stage.PROD]: {
 *       domainName: "prod-guardian.com",
 *       hostedZoneId: "id124",
 *     },
 *   },
 *   monitoringConfiguration: {
 *     tolerated5xxPercentage: 1,
 *     snsTopicName: "alerts-topic-for-my-team",
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
export class GuEc2App {
  /*
   * These are public for now, as this allows users to
   * modify these constructs as desired to fit their
   * specific needs.
   * In the future, we might build functionality to better enable users
   * to access in-pattern constructs, but this would allow teams to be unblocked
   * in the short term.
   * */
  public readonly certificate: GuCertificate;
  public readonly loadBalancer: GuApplicationLoadBalancer;
  public readonly autoScalingGroup: GuAutoScalingGroup;
  public readonly listener: GuHttpsApplicationListener;
  public readonly targetGroup: GuApplicationTargetGroup;

  constructor(scope: GuStack, props: GuEc2AppProps) {
    AppIdentity.taggedConstruct(props, scope);

    const { app } = props;
    const vpc = GuVpc.fromIdParameter(scope, AppIdentity.suffixText(props, "VPC"), { app });
    const privateSubnets = GuVpc.subnetsfromParameter(scope, { type: SubnetType.PRIVATE, app });

    if (props.access.scope === AccessScope.RESTRICTED) validateRestrictedCidrRanges(props.access);

    const certificate = new GuCertificate(scope, {
      app,
      ...props.certificateProps,
    });

    const maybePrivateConfigPolicy =
      typeof props.userData !== "string" && props.userData.configuration
        ? [new GuGetPrivateConfigPolicy(scope, "GetPrivateConfigFromS3Policy", props.userData.configuration)]
        : [];

    const mergedRoleConfiguration: GuInstanceRoleProps = {
      withoutLogShipping: props.roleConfiguration?.withoutLogShipping,
      additionalPolicies: maybePrivateConfigPolicy.concat(props.roleConfiguration?.additionalPolicies ?? []),
    };

    const autoScalingGroup = new GuAutoScalingGroup(scope, "AutoScalingGroup", {
      app,
      vpc,
      stageDependentProps: {
        CODE: {
          minimumInstances: props.scaling?.CODE.minimumInstances ?? 1,
          maximumInstances: props.scaling?.CODE.maximumInstances,
        },
        PROD: {
          minimumInstances: props.scaling?.PROD.minimumInstances ?? 3,
          maximumInstances: props.scaling?.PROD.maximumInstances,
        },
      },
      role: new GuInstanceRole(scope, { app: props.app, ...mergedRoleConfiguration }),
      healthCheck: HealthCheck.elb({ grace: Duration.minutes(2) }), // should this be defaulted at pattern or construct level?
      userData:
        typeof props.userData !== "string"
          ? new GuUserData(scope, { app, ...props.userData }).userData
          : props.userData,
      vpcSubnets: { subnets: privateSubnets },
    });

    const loadBalancer = new GuApplicationLoadBalancer(scope, "LoadBalancer", {
      app,
      vpc,
      // This is always set to true, as it determines the load balancer scheme as `internet-facing` rather than internal.
      // This does not result in public access to the load balancer in itself however, as that is handled by the listener's `open` prop
      internetFacing: true,
      vpcSubnets: { subnets: GuVpc.subnetsfromParameter(scope, { type: SubnetType.PUBLIC, app }) },
    });

    if (props.accessLogging) {
      const accessLoggingBucket = new GuSSMParameter(scope, { parameter: props.accessLogging.bucketSSMPath });

      loadBalancer.logAccessLogs(
        Bucket.fromBucketName(
          scope,
          AppIdentity.suffixText(props, "AccessLoggingBucket"),
          accessLoggingBucket.getValue()
        ),
        props.accessLogging.prefix
      );
    }

    const targetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
      app,
      vpc,
      protocol: ApplicationProtocol.HTTP,
      targets: [autoScalingGroup],
      port: props.applicationPort,
    });

    const listener = new GuHttpsApplicationListener(scope, "Listener", {
      app,
      loadBalancer,
      certificate,
      targetGroup,
      // When open=true, AWS will create a security group which allows all inbound traffic over HTTPS
      open: props.access.scope === AccessScope.PUBLIC,
    });

    // Since AWS won't create a security group automatically when open=false, we need to add our own
    if (props.access.scope === AccessScope.RESTRICTED) {
      loadBalancer.addSecurityGroup(
        new GuSecurityGroup(scope, "RestrictedIngressSecurityGroup", {
          app,
          vpc,
          description: "Allow restricted ingress from CIDR ranges",
          allowAllOutbound: false,
          ingresses: restrictedCidrRanges(props.access.cidrRanges),
        })
      );
    }

    if (!props.monitoringConfiguration.noMonitoring) {
      new Gu5xxPercentageAlarm(scope, "Alarm", {
        app,
        loadBalancer,
        ...props.monitoringConfiguration,
      });
    }

    this.certificate = certificate;
    this.loadBalancer = loadBalancer;
    this.autoScalingGroup = autoScalingGroup;
    this.listener = listener;
    this.targetGroup = targetGroup;
  }
}

/**
 * Creates an instance of [[`GuEc2App`]] with Play's [[GuApplicationPorts | default application port]].
 *
 * For all configuration options, see [[`GuEc2AppProps`]].
 */
export class GuPlayApp extends GuEc2App {
  constructor(scope: GuStack, props: GuMaybePortProps) {
    super(scope, { ...props, applicationPort: GuApplicationPorts.Play });
  }
}

/**
 * Creates an instance of [[`GuEc2App`]] with Node's [[GuApplicationPorts | default application port]].
 *
 * For all configuration options, see [[`GuEc2AppProps`]].
 */
export class GuNodeApp extends GuEc2App {
  constructor(scope: GuStack, props: GuMaybePortProps) {
    super(scope, { ...props, applicationPort: GuApplicationPorts.Node });
  }
}
