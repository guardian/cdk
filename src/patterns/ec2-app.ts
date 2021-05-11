import { HealthCheck } from "@aws-cdk/aws-autoscaling";
import type { IPeer } from "@aws-cdk/aws-ec2";
import { Port } from "@aws-cdk/aws-ec2";
import { ApplicationProtocol } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Duration } from "@aws-cdk/core";
import type { GuCertificateProps } from "../constructs/acm";
import { GuCertificate } from "../constructs/acm";
import type { GuUserDataProps } from "../constructs/autoscaling";
import { GuAutoScalingGroup, GuUserData } from "../constructs/autoscaling";
import type { Gu5xxPercentageMonitoringProps, NoMonitoring } from "../constructs/cloudwatch";
import { Gu5xxPercentageAlarm } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import { AppIdentity } from "../constructs/core/identity";
import { GuSecurityGroup, GuVpc, SubnetType } from "../constructs/ec2";
import type { GuInstanceRoleProps } from "../constructs/iam";
import { GuGetPrivateConfigPolicy, GuInstanceRole } from "../constructs/iam";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
} from "../constructs/loadbalancing";

export enum AccessScope {
  PUBLIC,
  RESTRICTED,
}

export interface Access {
  scope: AccessScope;
}

/*
 * For when you want your application to be accessible to the world (0.0.0.0/0).
 * Your application load balancer will have a public IP address that can be reached by anyone,
 * so only use if you are aware and happy with the consequences!
 * */
interface PublicAccess extends Access {
  scope: AccessScope.PUBLIC;
}

/*
 * For when you want to restrict your application's access to a list of CIDR ranges.
 * */
interface RestrictedAccess extends Access {
  scope: AccessScope.RESTRICTED;
  cidrRanges: IPeer[];
}

export type AppAccess = PublicAccess | RestrictedAccess;

/**
 * To grant applications additional IAM permissions, use the `roleConfiguration` prop. For example,
 * to allow your app to write to DynamoDB:
 *
 * ```typescript
 * // other props
 * roleConfiguration: {
 *   additionalPolicies: [new GuDynamoDBWritePolicy(stack, "DynamoTable", { tableName: "my-dynamo-table" })],
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
}

interface GuMaybePortProps extends Omit<GuEc2AppProps, "applicationPort"> {
  applicationPort?: number;
}

export enum GuApplicationPorts {
  Node = 3000,
  Play = 9000,
}

const OpenApplicationCidrError: Error = Error(`Your list of CIDR ranges includes 0.0.0.0/0, meaning all other ranges specified are unnecessary as
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

/*
 * This pattern is under development. Please don't attempt to use it yet.
 *
 * Usage:
 * ```typescript
 * new GuEc2App(stack, {
 *       applicationPort: GuApplicationPorts.Node,
 *       app: "app-name",
 *       // ONLY allows access to CIDR ranges provided
 *       access: { scope: AccessScope.RESTRICTED, cidrRanges: [Peer.ipv4("192.168.1.1/32"), Peer.ipv4("8.8.8.8/32")] },
 *       certificateProps:{
 *           [Stage.CODE]: {
 *             domainName: "code-guardian.com",
 *             hostedZoneId: "id123",
 *           },
 *           [Stage.PROD]: {
 *             domainName: "prod-guardian.com",
 *             hostedZoneId: "id124",
 *           },
 *       },
 *       monitoringConfiguration: { noMonitoring: true },
 *       userData: "",
 * });
 *
 * // For public-facing applications
 * new GuEc2App(stack, {
 *       applicationPort: GuApplicationPorts.Node,
 *       app: "app-name",
 *       // ONLY allows access to CIDR ranges provided
 *       access: { scope: AccessScope.PUBLIC },
 *       certificateProps:{
 *           [Stage.CODE]: {
 *             domainName: "code-guardian.com",
 *             hostedZoneId: "id123",
 *           },
 *           [Stage.PROD]: {
 *             domainName: "prod-guardian.com",
 *             hostedZoneId: "id124",
 *           },
 *       },
 *       monitoringConfiguration: { noMonitoring: true },
 *       userData: "",
 * });
 * ```
 * */
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
        CODE: { minimumInstances: 1 },
        PROD: { minimumInstances: 3 },
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
      internetFacing: true,
      vpcSubnets: { subnets: GuVpc.subnetsfromParameter(scope, { type: SubnetType.PUBLIC, app }) },
    });

    const targetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
      app,
      vpc,
      protocol: ApplicationProtocol.HTTP,
      targets: [autoScalingGroup],
      port: props.applicationPort,
    });

    const listener = new GuHttpsApplicationListener(scope, "Listener", {
      app,
      // When open=true, AWS will create a security group which allows all inbound traffic over HTTPS
      open: props.access.scope === AccessScope.PUBLIC,
      loadBalancer: loadBalancer,
      certificate: certificate,
      targetGroup: targetGroup,
    });

    // Since AWS won't create a security group automatically when open=false, we need to add our own
    if (props.access.scope === AccessScope.RESTRICTED) {
      listener.connections.addSecurityGroup(
        new GuSecurityGroup(scope, "SecurityGroup", {
          app,
          vpc,
          ingresses: restrictedCidrRanges(props.access.cidrRanges),
        })
      );
    }

    if (!props.monitoringConfiguration.noMonitoring) {
      new Gu5xxPercentageAlarm(scope, "Alarm", {
        app,
        loadBalancer: loadBalancer,
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

/*
This pattern is under development. Please don't attempt to use it yet.
 */
export class GuPlayApp extends GuEc2App {
  constructor(scope: GuStack, props: GuMaybePortProps) {
    super(scope, { ...props, applicationPort: GuApplicationPorts.Play });
  }
}

/*
This pattern is under development. Please don't attempt to use it yet.
 */
export class GuNodeApp extends GuEc2App {
  constructor(scope: GuStack, props: GuMaybePortProps) {
    super(scope, { ...props, applicationPort: GuApplicationPorts.Node });
  }
}
