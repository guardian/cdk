import type { BlockDevice } from "@aws-cdk/aws-autoscaling";
import { HealthCheck } from "@aws-cdk/aws-autoscaling";
import type { InstanceType, IPeer, IVpc } from "@aws-cdk/aws-ec2";
import { Port } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Bucket } from "@aws-cdk/aws-s3";
import { Duration, Tags, Token } from "@aws-cdk/core";
import { Stage } from "../constants";
import { AccessScope } from "../constants/access";
import { SSM_PARAMETER_PATHS } from "../constants/ssm-parameter-paths";
import { TagKeys } from "../constants/tag-keys";
import { GuCertificate } from "../constructs/acm";
import type { GuUserDataProps } from "../constructs/autoscaling";
import { GuAutoScalingGroup, GuUserData } from "../constructs/autoscaling";
import type { Http5xxAlarmProps, NoMonitoring } from "../constructs/cloudwatch";
import { Gu5xxPercentageAlarm, GuUnhealthyInstancesAlarm } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import { GuStringParameter } from "../constructs/core";
import { AppIdentity } from "../constructs/core/identity";
import { GuSecurityGroup, GuVpc, SubnetType } from "../constructs/ec2";
import type { GuInstanceRoleProps } from "../constructs/iam";
import { GuGetPrivateConfigPolicy, GuInstanceRole } from "../constructs/iam";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
} from "../constructs/loadbalancing";
import type { AppAccess, InternalAccess, RestrictedAccess } from "../types/access";
import type { GuAsgCapacity } from "../types/asg";
import type { GuDomainName } from "../types/domain-names";
import { StageAwareValue } from "../types/stage";

export interface AccessLoggingProps {
  enabled: boolean;
  prefix?: string;
}

export interface Alarms {
  snsTopicName: string;
  http5xxAlarm: false | Http5xxAlarmProps;
  unhealthyInstancesAlarm: boolean;
  noMonitoring?: false;

  /**
   * Whether alarm actions are enabled on the `CODE` stage.
   *
   * @default false
   */
  actionsEnabledInCode?: boolean;
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
 * To configure your scaling policies for AutoScalingGroups, use the `scaling` prop. For example:
 * ```typescript
 * // other props
 * scaling: {
 *   CODE: { minimumInstances: 3 },
 *   PROD: { minimumInstances: 5, maximumInstances: 12 }
 * }
 * ```
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
 * ```
 *  * ```typescript
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
  accessLogging?: AccessLoggingProps;
  blockDevices?: BlockDevice[];
  scaling: StageAwareValue<GuAsgCapacity>;
  certificateProps: StageAwareValue<GuDomainName>;
}

const OpenApplicationCidrError: Error =
  Error(`Your list of CIDR ranges includes 0.0.0.0/0, meaning all other ranges specified are unnecessary as
your application is open to the world. Please either remove the open CIDR range or use the PUBLIC access scope.`);

const PublicCidrError: Error =
  Error(`Your list of CIDR ranges includes a public ip, which will not be able to reach an internal load balancer.
  Please either remove the public CIDR range or use the RESTRICTED access scope.`);

function validateRestrictedCidrRanges(access: RestrictedAccess) {
  const openToWorld = access.cidrRanges.map((range) => range.uniqueId).includes("0.0.0.0/0");
  if (openToWorld) throw OpenApplicationCidrError;
}

function validateInternalCidrRanges(access: InternalAccess) {
  const publicCidrRanges = access.cidrRanges.filter((range) => !range.uniqueId.startsWith("10."));
  const containsPublicIps = publicCidrRanges.length > 0;
  if (containsPublicIps) throw PublicCidrError;
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
 *   instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
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
      applicationPort,
      blockDevices,
      certificateProps,
      instanceType,
      monitoringConfiguration,
      roleConfiguration = { withoutLogShipping: false, additionalPolicies: [] },
      scaling,
      userData,
    } = props;

    const { stage } = scope;

    const vpc = GuVpc.fromIdParameter(scope, AppIdentity.suffixText({ app }, "VPC"));
    const privateSubnets = GuVpc.subnetsFromParameter(scope, { type: SubnetType.PRIVATE, app });

    if (access.scope === AccessScope.RESTRICTED) validateRestrictedCidrRanges(access);
    if (access.scope === AccessScope.INTERNAL) validateInternalCidrRanges(access);

    const hostedZone = (): undefined | string => {
      const hasHostedZoneId: boolean = StageAwareValue.isStageValue(certificateProps)
        ? !!certificateProps.CODE.hostedZoneId && !!certificateProps.PROD.hostedZoneId
        : !!certificateProps.INFRA.hostedZoneId;

      if (!hasHostedZoneId) {
        return;
      }

      /* eslint-disable @typescript-eslint/no-non-null-assertion -- `hasHostedZoneId` is true, so we know `hostedZoneId` is present here */
      return StageAwareValue.isStageValue(certificateProps)
        ? scope.withStageDependentValue({
            app,
            variableName: "hostedZoneId",
            stageValues: {
              [Stage.CODE]: certificateProps.CODE.hostedZoneId!,
              [Stage.PROD]: certificateProps.PROD.hostedZoneId!,
            },
          })
        : certificateProps.INFRA.hostedZoneId!;
      /* eslint-enable @typescript-eslint/no-non-null-assertion */
    };

    const certificate = new GuCertificate(scope, {
      app,
      domainName: StageAwareValue.isStageValue(certificateProps)
        ? scope.withStageDependentValue({
            app,
            variableName: "domainName",
            stageValues: {
              [Stage.CODE]: certificateProps.CODE.domainName,
              [Stage.PROD]: certificateProps.PROD.domainName,
            },
          })
        : certificateProps.INFRA.domainName,
      hostedZoneId: hostedZone(),
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
      minimumInstances: StageAwareValue.isStageValue(scaling)
        ? scope.withStageDependentValue({
            app,
            variableName: "minInstances",
            stageValues: {
              [Stage.CODE]: scaling.CODE.minimumInstances,
              [Stage.PROD]: scaling.PROD.minimumInstances,
            },
          })
        : scaling.INFRA.minimumInstances,
      maximumInstances: StageAwareValue.isStageValue(scaling)
        ? scope.withStageDependentValue({
            app,
            variableName: "maxInstances",
            stageValues: {
              [Stage.CODE]: scaling.CODE.maximumInstances ?? scaling.CODE.minimumInstances * 2,
              [Stage.PROD]: scaling.PROD.maximumInstances ?? scaling.PROD.minimumInstances * 2,
            },
          })
        : scaling.INFRA.maximumInstances ?? scaling.INFRA.minimumInstances * 2,
      role: new GuInstanceRole(scope, { app, ...mergedRoleConfiguration }),
      healthCheck: HealthCheck.elb({ grace: Duration.minutes(2) }), // should this be defaulted at pattern or construct level?
      userData: typeof userData !== "string" ? new GuUserData(scope, { app, ...userData }).userData : userData,
      vpcSubnets: { subnets: privateSubnets },
      ...(blockDevices && { blockDevices }),
    });

    // We are selectively tagging the ASG so that we can expose the number of stacks using this pattern
    //  based on which autoscaling groups possess this tag. It may become useful or necessary to tag all resources in the future,
    //  but we have decided that this is sufficient for now.
    // TODO: Do we need to tag all resources with this value? What would the use-cases be?
    Tags.of(autoScalingGroup).add(TagKeys.PATTERN_NAME, this.constructor.name, { applyToLaunchedInstances: true });

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
        description: SSM_PARAMETER_PATHS.AccessLoggingBucket.description,
        default: SSM_PARAMETER_PATHS.AccessLoggingBucket.path,
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
      const {
        http5xxAlarm,
        snsTopicName,
        unhealthyInstancesAlarm,
        actionsEnabledInCode = false,
      } = monitoringConfiguration;

      /*
      Stage is known at runtime if it is a CFN Parameter, e.g. CODE or PROD.
      Stage is known at compile time for singleton stacks, e.g. INFRA.
       */
      const isStageDeterminedAtRuntime = Token.isUnresolved(stage);

      // Only add a Mapping to the template when strictly necessary, i.e. when the value differs across stages
      const actionsEnabled: boolean =
        actionsEnabledInCode || !isStageDeterminedAtRuntime
          ? true
          : scope.withStageDependentValue({
              app,
              variableName: "alarmActionsEnabled",
              stageValues: {
                [Stage.CODE]: false,
                [Stage.PROD]: true,
              },
            });

      if (http5xxAlarm) {
        new Gu5xxPercentageAlarm(scope, {
          app,
          loadBalancer,
          snsTopicName,
          ...http5xxAlarm,
          actionsEnabled,
        });
      }
      if (unhealthyInstancesAlarm) {
        new GuUnhealthyInstancesAlarm(scope, {
          app,
          targetGroup,
          snsTopicName,
          actionsEnabled,
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
