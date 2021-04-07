import { HealthCheck } from "@aws-cdk/aws-autoscaling";
import { Certificate } from "@aws-cdk/aws-certificatemanager";
import { ApplicationProtocol, ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2";
import { Duration } from "@aws-cdk/core";
import { GuAutoScalingGroup, GuUserData } from "../constructs/autoscaling";
import type { GuStack } from "../constructs/core";
import { GuArnParameter } from "../constructs/core";
import type { AppIdentity } from "../constructs/core/identity";
import { GuVpc, SubnetType } from "../constructs/ec2";
import { GuInstanceRole } from "../constructs/iam";
import {
  GuApplicationListener,
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
} from "../constructs/loadbalancing";

interface GuEc2AppProps extends AppIdentity {
  userData: GuUserData | string;
  publicFacing: boolean; // could also name it `internetFacing` to match GuApplicationLoadBalancer
  applicationPort: number | GuApplicationPorts;
}

export enum GuApplicationPorts {
  Node = 3000,
  Play = 9000,
}

export class GuEc2App {
  constructor(scope: GuStack, props: GuEc2AppProps) {
    scope.tags.setTag("App", props.app);

    const vpc = GuVpc.fromIdParameter(scope, "VPC");

    // TODO: Establish how this works in CFN at deploy-time. Can we get away with this vs
    //  needing to create a `subnets` parameter?
    const privateSubnets = GuVpc.subnetsfromParameter(scope, { type: SubnetType.PRIVATE });

    const certificateArn = new GuArnParameter(scope, "CertArn", {
      description: "ARN of a TLS certificate to install on the load balancer",
    });

    const certificate = Certificate.fromCertificateArn(scope, "Certificate", certificateArn.valueAsString);

    const asg = new GuAutoScalingGroup(scope, "AutoScalingGroup", {
      vpc,
      app: props.app,
      stageDependentProps: {
        CODE: { minimumInstances: 1 },
        PROD: { minimumInstances: 3 },
      },
      role: new GuInstanceRole(scope, { app: props.app }),
      healthCheck: HealthCheck.elb({ grace: Duration.minutes(2) }),
      userData: props.userData instanceof GuUserData ? props.userData.userData : props.userData,
      vpcSubnets: { subnets: privateSubnets },
    });

    const loadBalancer = new GuApplicationLoadBalancer(scope, "LoadBalancer", {
      vpc: vpc,
      vpcSubnets: {
        subnets: props.publicFacing ? GuVpc.subnetsfromParameter(scope, { type: SubnetType.PUBLIC }) : privateSubnets,
      },
    });

    const targetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
      vpc,
      protocol: ApplicationProtocol.HTTP,
      targets: [asg],
      port: props.applicationPort,
    });

    new GuApplicationListener(scope, "Listener", {
      loadBalancer: loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [certificate],
    });
  }
}
