import { Certificate } from "@aws-cdk/aws-certificatemanager";
import { ApplicationProtocol, ListenerAction, TargetType } from "@aws-cdk/aws-elasticloadbalancingv2";
import { GuAutoScalingGroup } from "../constructs/autoscaling";
import { GuArnParameter, GuStack } from "../constructs/core";
import type { AppIdentity } from "../constructs/core/identity";
import { GuVpc, SubnetType } from "../constructs/ec2";
import {
  GuApplicationListener,
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
} from "../constructs/loadbalancing";

interface GuEc2AppProps extends AppIdentity {
  userData: string;
  publicFacing: boolean; // could also name it `internetFacing` to match GuApplicationLoadBalancer
  applicationPort: number | GuApplicationPorts;

  // Ignore these
  // autoscalingGroup: {
  //   vpc?: string;
  //   subnets?: string[];
  //   role?: string;
  //   capacity?: { min: number; max?: number };
  //   healthcheck?: string;
  //   targetGroup?: string;
  //   additionalSecurityGroups?: string[];
  //   associatePublicIpAddress?: boolean; // inferred from publicFacing
  // };
  //
  // loadbalancer: { optional: { certificates: string[]; open: false } };
}

export enum GuApplicationPorts {
  Node = 3000,
  Play = 9000,
}

export class GuEc2App {
  constructor(scope: GuStack, props: GuEc2AppProps) {
    const vpc = GuVpc.fromIdParameter(scope, "VPC");

    // TODO: Establish how this works in CFN at deploy-time. Can we get away with this vs
    //  needing to create a `subnets` parameter?
    const privateSubnets = GuVpc.subnetsfromParameter(scope, { type: SubnetType.PRIVATE });

    const certificateArn = new GuArnParameter(scope, "CertArn", {
      description: "ARN of a TLS certificate to install on the load balancer",
    });

    const certificate = Certificate.fromCertificateArn(scope, "Certificate", certificateArn.valueAsString);

    new GuAutoScalingGroup(scope, "AutoScalingGroup", {
      vpc,
      app: props.app,
      stageDependentProps: {
        CODE: { minimumInstances: 1 },
        PROD: { minimumInstances: 3 },
      },
      userData: props.userData,
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
      targetType: TargetType.INSTANCE,
    });

    new GuApplicationListener(scope, "Listener", {
      loadBalancer: loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [certificate],
    });
  }
}
