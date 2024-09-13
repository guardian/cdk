import { Duration } from "aws-cdk-lib";
import type { CfnAutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../constructs/core";
import type { GuEc2AppProps } from "../../patterns";
import { GuEc2App } from "../../patterns";

export interface GuEc2AppExperimentalProps extends Omit<GuEc2AppProps, "updatePolicy"> {}

/**
 * An experimental pattern to instantiate an EC2 application that is updated entirely via CloudFormation.
 *
 * NOTE: The "autoscaling" deployment type in Riff-Raff is not valid with this pattern.
 * Please remove it from any manually created `riff-raff.yaml` file.
 *
 * This pattern sets the update policy of the `AWS::AutoScaling::AutoScalingGroup` to `AutoScalingRollingUpdate`.
 * When a CloudFormation update is applied, the current instances in the ASG will be replaced.
 *
 * This pattern also updates the User Data, running some commands AFTER yours.
 * These changes are wrapped in start and end marking comments.
 *
 * This pattern should improve the reliability of scaling events triggered during a deployment.
 * Unlike in Riff-Raff's "autoscaling" deployment, scaling alarms are never suspended.
 * TODO test scaling alarm behaviour.
 *
 * To update the application's code, a CloudFormation update must be triggered.
 * The best way to do this is to include the build number in the application artifact.
 * TODO test User Data includes a build number.
 *
 * NOTE: This pattern:
 *  - Is NOT compatible with the "autoscaling" Riff-Raff deployment type.
 *  - Your application should include a build number in its filename.
 *    This value will change across builds, and therefore create a CloudFormation template difference to be deployed.
 *  - Requires the AWS CLI and `cfn-signal` binaries to be available on the instance, and on the `PATH`.
 *    AMIgo adds these via the `aws-tools` role.
 *
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate
 */
export class GuEc2AppExperimental extends GuEc2App {
  constructor(scope: GuStack, props: GuEc2AppExperimentalProps) {
    const { minimumInstances, maximumInstances = minimumInstances * 2 } = props.scaling;
    const { applicationPort } = props;
    const { region, stackId } = scope;

    super(scope, {
      ...props,
      updatePolicy: UpdatePolicy.rollingUpdate({
        maxBatchSize: maximumInstances,
        minInstancesInService: minimumInstances,
        minSuccessPercentage: 100,
        waitOnResourceSignals: true,
        suspendProcesses: [],
      }),
    });

    const { autoScalingGroup, targetGroup } = this;
    const { userData, role } = autoScalingGroup;
    const cfnAutoScalingGroup = autoScalingGroup.node.defaultChild as CfnAutoScalingGroup;

    cfnAutoScalingGroup.desiredCapacity = minimumInstances.toString();

    // TODO are these sensible values?
    const signalTimeoutSeconds = Math.max(
      targetGroup.healthCheck.timeout?.toSeconds() ?? 0,
      cfnAutoScalingGroup.healthCheckGracePeriod ?? 0,
      Duration.minutes(5).toSeconds(),
    );

    const currentRollingUpdate = cfnAutoScalingGroup.cfnOptions.updatePolicy?.autoScalingRollingUpdate;

    cfnAutoScalingGroup.cfnOptions.updatePolicy = {
      autoScalingRollingUpdate: {
        ...currentRollingUpdate,
        pauseTime: Duration.seconds(signalTimeoutSeconds).toIsoString(),
      },
    };

    cfnAutoScalingGroup.cfnOptions.creationPolicy = {
      autoScalingCreationPolicy: {
        minSuccessfulInstancesPercent: 100,
      },
      resourceSignal: {
        count: minimumInstances,
        timeout: Duration.seconds(signalTimeoutSeconds).toIsoString(),
      },
    };

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

      echo "Instance is healthy in target group."
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
  }
}
