import type { IApplicationListener, IApplicationTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { ListenerAction } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import type { GuStack } from "../../constructs/core";

interface MigrateToEcsProps {
  originalListener: IApplicationListener;
  ec2TargetGroup: IApplicationTargetGroup;
  ecsTargetGroup: IApplicationTargetGroup;
  trafficWeightForEcs: number; // Must be between 0 and 999
}

export class MigrateToEcsExperimental extends Construct {
  constructor(scope: GuStack, props: MigrateToEcsProps) {
    super(scope, "MigrateToEcsTargetGroup");
    const { originalListener, ec2TargetGroup, ecsTargetGroup, trafficWeightForEcs } = props;
    // Need to check existing actions; if there are several (e.g. for GoogleAuth or path-based routing) then this won't work as desired
    originalListener.addAction("SplitTrafficBetweenEc2AndEcs", {
      action: ListenerAction.weightedForward([
        { targetGroup: ecsTargetGroup, weight: trafficWeightForEcs },
        { targetGroup: ec2TargetGroup, weight: 999 - trafficWeightForEcs },
      ]),
    });
  }
}
