import { ListenerAction } from "@aws-cdk/aws-elasticloadbalancingv2";
import { simpleGuStackForTesting } from "../../test/utils";
import { GuAutoScalingGroup } from "../constructs/autoscaling";
import type { GuStack } from "../constructs/core";
import type { AppIdentity } from "../constructs/core/identity";
import { GuVpc } from "../constructs/ec2";
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

enum GuApplicationPorts {
  Node = 3000,
  Play = 9000,
}

export class GuEc2App {
  constructor(scope: GuStack, props: GuEc2AppProps) {
    const vpc = GuVpc.fromIdParameter(scope, "vpc");

    new GuAutoScalingGroup(scope, {
      app: props.app,
      stageDependentProps: {
        CODE: { minimumInstances: 1 },
        PROD: { minimumInstances: 3 },
      },
      userData: props.userData,
      vpc: vpc,
    });

    const loadBalancer = new GuApplicationLoadBalancer(scope, {
      app: props.app,
      vpc: vpc,
    });

    const targetGroup = new GuApplicationTargetGroup(scope, "targetGroup", {});
    new GuApplicationListener(scope, "listener", {
      loadBalancer: loadBalancer,
      defaultAction: ListenerAction.forward([targetGroup]),
    });
  }
}

const stack = simpleGuStackForTesting();
new GuEc2App(stack, {
  applicationPort: GuApplicationPorts.Node,
  app: "my-amazing-app",
  publicFacing: false,
  userData: "#!/bin/dev foobarbaz",
});
