import { HealthCheck } from "@aws-cdk/aws-autoscaling";
import { ApplicationProtocol, ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Duration } from "@aws-cdk/core";
import type { GuCertificateProps } from "../constructs/acm";
import { GuCertificate } from "../constructs/acm";
import type { GuUserDataProps } from "../constructs/autoscaling";
import { GuAutoScalingGroup, GuUserData } from "../constructs/autoscaling";
import type { GuStack } from "../constructs/core";
import { AppIdentity } from "../constructs/core/identity";
import { GuVpc, SubnetType } from "../constructs/ec2";
import { GuGetPrivateConfigPolicy, GuInstanceRole } from "../constructs/iam";
import {
  GuApplicationListener,
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
} from "../constructs/loadbalancing";

interface GuEc2AppProps extends AppIdentity {
  userData: GuUserDataProps | string;
  publicFacing: boolean; // could also name it `internetFacing` to match GuApplicationLoadBalancer
  applicationPort: number;
  certificateProps: GuCertificateProps;
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

    const asg = new GuAutoScalingGroup(scope, "AutoScalingGroup", {
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
      vpcSubnets: {
        subnets: props.publicFacing ? GuVpc.subnetsfromParameter(scope, { type: SubnetType.PUBLIC }) : privateSubnets,
      },
    });

    const targetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
      app,
      vpc,
      protocol: ApplicationProtocol.HTTP,
      targets: [asg],
      port: props.applicationPort,
    });

    new GuApplicationListener(scope, "Listener", {
      app,
      loadBalancer: loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [certificate],
    });
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
