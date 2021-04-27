import { HealthCheck } from "@aws-cdk/aws-autoscaling";
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
import { GuGetPrivateConfigPolicy, GuInstanceRole } from "../constructs/iam";
import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener,
} from "../constructs/loadbalancing";
import { transformToSecurityGroupAccessRule } from "../utils/security-groups";

const PUBLIC = "PUBLIC" as const;
const RESTRICTED = "RESTRICTED" as const;

interface Access {
  type: string;
}

/*
 * For when you want your application to be accessible to the world.
 * Your application load balancer will have a public IP address that can be reached by anyone,
 * so only use if you are aware and happy with the consequences!
 * */
interface PublicAccess extends Access {
  type: typeof PUBLIC;
}

/*
 * For when you want to restrict your application's access to a list of CIDR ranges.
 *
 * */
interface RestrictedAccess extends Access {
  type: typeof RESTRICTED;
  cidrRanges: string[];
}

type AppAccess = PublicAccess | RestrictedAccess;

interface GuEc2AppProps extends AppIdentity {
  userData: GuUserDataProps | string;
  access: AppAccess;
  applicationPort: number;
  certificateProps: GuCertificateProps;
  monitoringConfiguration: NoMonitoring | Gu5xxPercentageMonitoringProps;
}

interface GuMaybePortProps extends Omit<GuEc2AppProps, "applicationPort"> {
  applicationPort?: number;
}

export enum GuApplicationPorts {
  Node = 3000,
  Play = 9000,
}

/*
This pattern is under development. Please don't attempt to use it yet.
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

    const certificate = new GuCertificate(scope, {
      app,
      ...props.certificateProps,
    });

    const maybePrivateConfigPolicy =
      typeof props.userData !== "string" && props.userData.configuration
        ? [new GuGetPrivateConfigPolicy(scope, "GetPrivateConfigFromS3Policy", props.userData.configuration)]
        : [];

    const autoScalingGroup = new GuAutoScalingGroup(scope, "AutoScalingGroup", {
      app,
      vpc,
      stageDependentProps: {
        CODE: { minimumInstances: 1 },
        PROD: { minimumInstances: 3 },
      },
      role: new GuInstanceRole(scope, { app: props.app, additionalPolicies: maybePrivateConfigPolicy }),
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
      ...(props.access.type === RESTRICTED && {
        securityGroup: new GuSecurityGroup(scope, AppIdentity.suffixText({ app }, "SecurityGroup"), {
          app,
          vpc,
          ingresses: transformToSecurityGroupAccessRule(Object.entries(props.access.cidrRanges), 443),
        }),
      }),
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
      open: props.access.type === PUBLIC, // this is true as default, which adds an ingress rule to allow all inbound traffic
      loadBalancer: loadBalancer,
      certificate: certificate,
      targetGroup: targetGroup,
    });

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
