import { Duration } from "aws-cdk-lib";
import type { CfnAutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../constructs/core";
import type { GuEc2AppProps } from "../../patterns";
import { GuEc2App } from "../../patterns";

export interface GuEc2AppExperimentalProps extends Omit<GuEc2AppProps, "updatePolicy"> {}

export class GuEc2AppExperimental extends GuEc2App {
  constructor(scope: GuStack, props: GuEc2AppExperimentalProps) {
    super(scope, { ...props, updatePolicy: UpdatePolicy.replacingUpdate() });

    const { applicationPort } = props;
    const { minimumInstances } = props.scaling;
    const { region, stackId } = scope;
    const { autoScalingGroup, targetGroup } = this;
    const { userData, role } = autoScalingGroup;
    const cfnAutoScalingGroup = autoScalingGroup.node.defaultChild as CfnAutoScalingGroup;

    new Policy(scope, "AsgReplacingUpdatePolicy", {
      statements: [
        // Allow usage of command `cfn-signal`.
        new PolicyStatement({
          actions: ["cloudformation:SignalResource"],
          effect: Effect.ALLOW,
          resources: [stackId],
        }),

        /*
        Allow usage of command `aws elbv2 describe-target-health`.
        AWS Elastic Load Balancing does not support resource based policies, so the resource has to be `*` (any) here.
        See https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_aws-services-that-work-with-iam.html
         */
        new PolicyStatement({
          actions: ["elasticloadbalancing:DescribeTargetHealth"],
          effect: Effect.ALLOW,
          resources: ["*"],
        }),
      ],
    }).attachToRole(role);

    /*
    `ec2metadata` is available via `cloud-utils` installed on all Canonical Ubuntu AMIs.
    See https://github.com/canonical/cloud-utils.

    `aws` is available via AMIgo baked AMIs.
    See https://github.com/guardian/amigo/tree/main/roles/aws-tools.
     */
    userData.addCommands(
      `# ${GuEc2AppExperimental.name} UserData Start`,
      `
      INSTANCE_ID=$(ec2metadata --instance-id)

      STATE=$(aws elbv2 describe-target-health \
        --target-group-arn ${targetGroup.targetGroupArn} \
        --region ${region} \
        --targets Id=$INSTANCE_ID,Port=${applicationPort} \
        --query "TargetHealthDescriptions[0].TargetHealth.State")

      until [ "$STATE" == "\\"healthy\\"" ]; do
        echo "Instance not yet healthy within target group. Current state $STATE. Sleeping..."
        sleep 5
        STATE=$(aws elbv2 describe-target-health \
          --target-group-arn ${targetGroup.targetGroupArn} \
          --region ${region} \
          --targets Id=$INSTANCE_ID,Port=${applicationPort} \
          --query "TargetHealthDescriptions[0].TargetHealth.State")
      done
      `,
      `# ${GuEc2AppExperimental.name} UserData End`,
    );

    userData.addOnExitCommands(
      `
        cfn-signal --stack ${stackId} \
          --resource ${cfnAutoScalingGroup.logicalId} \
          --region ${region} \
          --exit-code $exitCode || echo 'Failed to send Cloudformation Signal'
        `,
    );

    // TODO are these sensible values?
    const signalTimeoutSeconds = Math.max(
      targetGroup.healthCheck.timeout?.toSeconds() ?? 0,
      cfnAutoScalingGroup.healthCheckGracePeriod ?? 0,
      Duration.minutes(5).toSeconds(),
    );

    cfnAutoScalingGroup.cfnOptions.creationPolicy = {
      autoScalingCreationPolicy: {
        minSuccessfulInstancesPercent: 100,
      },
      resourceSignal: {
        count: minimumInstances,
        timeout: Duration.seconds(signalTimeoutSeconds).toIsoString(),
      },
    };
  }
}
