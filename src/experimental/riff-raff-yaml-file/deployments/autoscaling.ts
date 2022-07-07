import type { GuAutoScalingGroup } from "../../../constructs/autoscaling";
import type { GuStack } from "../../../constructs/core";
import type { RiffRaffDeployment } from "../types";

export function uploadAutoscalingArtifact(asg: GuAutoScalingGroup): RiffRaffDeployment {
  const { app } = asg;
  const { stack, region } = asg.stack as GuStack;

  return {
    name: ["asg-upload", region, stack, app].join("-"),
    props: {
      type: "autoscaling",
      actions: ["uploadArtifacts"],
      regions: new Set([region]),
      stacks: new Set([stack]),
      app,
      parameters: {
        bucketSsmLookup: true,
        prefixApp: true,
      },
      contentDirectory: app,
    },
  };
}

export function autoscalingDeployment(
  asg: GuAutoScalingGroup,
  { name: cfnDeployName }: RiffRaffDeployment
): RiffRaffDeployment {
  const { app } = asg;
  const { stack, region } = asg.stack as GuStack;

  return {
    name: ["asg-update", region, stack, app].join("-"),
    props: {
      type: "autoscaling",
      actions: ["deploy"],
      regions: new Set([region]),
      stacks: new Set([stack]),
      app,
      parameters: {
        bucketSsmLookup: true,
        prefixApp: true,
      },
      dependencies: [cfnDeployName],
      contentDirectory: app,
    },
  };
}
