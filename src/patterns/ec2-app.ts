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
  applicationPort: GuApplicationPorts | number;
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
    const id = (id: string) => `${props.app}${id}`;

    scope.tags.setTag(id("App"), props.app);

    const { app } = props;
    const vpc = GuVpc.fromIdParameter(scope, id("VPC"), { app });
    const privateSubnets = GuVpc.subnetsfromParameter(scope, { type: SubnetType.PRIVATE, app });

    const certificateArn = new GuArnParameter(scope, id("CertArn"), {
      description: "ARN of a TLS certificate to install on the load balancer",
    });

    const certificate = Certificate.fromCertificateArn(scope, id("Certificate"), certificateArn.valueAsString);

    const asg = new GuAutoScalingGroup(scope, id("AutoScalingGroup"), {
      vpc,
      app: props.app,
      stageDependentProps: {
        CODE: { minimumInstances: 1 },
        PROD: { minimumInstances: 3 },
      },
      role: new GuInstanceRole(scope, { app: props.app }),
      healthCheck: HealthCheck.elb({ grace: Duration.minutes(2) }), // should this be defaulted at pattern or construct level?
      userData: props.userData instanceof GuUserData ? props.userData.userData : props.userData,
      vpcSubnets: { subnets: privateSubnets },
    });

    const loadBalancer = new GuApplicationLoadBalancer(scope, id("LoadBalancer"), {
      app,
      vpc,
      vpcSubnets: {
        subnets: props.publicFacing ? GuVpc.subnetsfromParameter(scope, { type: SubnetType.PUBLIC }) : privateSubnets,
      },
    });

    const targetGroup = new GuApplicationTargetGroup(scope, id("TargetGroup"), {
      app,
      vpc,
      protocol: ApplicationProtocol.HTTP,
      targets: [asg],
      port: props.applicationPort,
    });

    new GuApplicationListener(scope, id("Listener"), {
      app,
      loadBalancer: loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
      certificates: [certificate],
    });
  }
}
