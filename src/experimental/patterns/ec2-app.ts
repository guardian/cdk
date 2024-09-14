import type { IAspect } from "aws-cdk-lib";
import { Aspects, CfnParameter, Duration } from "aws-cdk-lib";
import type { CfnAutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { CfnScalingPolicy, ScalingProcess, UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { IConstruct } from "constructs";
import { GuAutoScalingGroup } from "../../constructs/autoscaling";
import type { GuStack } from "../../constructs/core";
import type { GuEc2AppProps } from "../../patterns";
import { GuEc2App } from "../../patterns";
import { isSingletonPresentInStack } from "../../utils/singleton";

/**
 * An `Aspect` that adjusts the properties of an AutoScaling Group using an `AutoScalingRollingUpdate` update policy.
 *
 * It'll unset the `DesiredCapacity` of the ASG as a rolling update sets `Desired` back to the template version,
 * undoing any changes that a scale-out event may have done.
 * Having `DesiredCapacity` unset ensures the service remains at-capacity at all times.
 *
 * It'll also make the `MinInstancesInService` property dynamic via a CFN Parameter that Riff-Raff will set.
 * The value depends on the current capacity of the ASG:
 *  - If the service is running normally, it'll be set to the `MinSize` capacity
 *  - If the service is partially scaled, it'll be set to the current `DesiredCapacity`
 *  - If the service is fully scaled, it'll be set to (at least) `MaxSize` - 1
 *
 * @privateRemarks
 * - Temporarily implemented as a singleton to ensure only one instance is added to a stack,
 *   else multiple attempts to add the same CFN Parameter will be made and fail.
 * - Once out of experimental, instantiate this `Aspect` directly in {@link GuStack}.
 *
 * @see https://github.com/guardian/testing-asg-rolling-update
 */
class HorizontallyScalingDeploymentProperties implements IAspect {
  public readonly stack: GuStack;
  private readonly asgToParamMap: Map<string, CfnParameter>;
  private static instance: HorizontallyScalingDeploymentProperties | undefined;

  private constructor(scope: GuStack) {
    this.stack = scope;
    this.asgToParamMap = new Map();
  }

  public static getInstance(stack: GuStack): HorizontallyScalingDeploymentProperties {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new HorizontallyScalingDeploymentProperties(stack);
    }

    return this.instance;
  }

  public visit(construct: IConstruct) {
    if (construct instanceof CfnScalingPolicy) {
      const { node } = construct;
      const { scopes, path } = node;

      /*
      Requiring a `CfnScalingPolicy` to be created in the scope of a `GuAutoScalingGroup`
      is the most reliable way to associate the two together.

      Though the `autoScalingGroupName` property is passed to a `CfnScalingPolicy` when instantiating,
      this does not create a concrete link as AWS CDK sets the value to be the ASG's `Ref`.
      That is, it is a `Token` until it is synthesised.
      This is even if the ASG has an explicit name set.

      See also:
        - https://docs.aws.amazon.com/cdk/v2/guide/tokens.html
        - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-autoscaling-autoscalinggroup.html#aws-resource-autoscaling-autoscalinggroup-return-values
        - https://github.com/aws/aws-cdk/blob/f6b649d47f8bc30ca741fbb7a4852d51e8275002/packages/aws-cdk-lib/aws-autoscaling/lib/auto-scaling-group.ts#L1560
       */
      const autoScalingGroup = scopes.find((_): _ is GuAutoScalingGroup => _ instanceof GuAutoScalingGroup);

      if (!autoScalingGroup) {
        throw new Error(
          `Failed to detect the autoscaling group relating to the scaling policy on path ${path}. Was it created in the scope of a GuAutoScalingGroup?`,
        );
      }

      const cfnAutoScalingGroup = autoScalingGroup.node.defaultChild as CfnAutoScalingGroup;
      const currentRollingUpdate = cfnAutoScalingGroup.cfnOptions.updatePolicy?.autoScalingRollingUpdate;

      if (currentRollingUpdate) {
        /*
        An autoscaling group that horizontally scales should not explicitly set `Desired`,
        as a rolling update will set the current `Desired` back to the template version,
        undoing any changes that a scale-out event may have done.
         */
        cfnAutoScalingGroup.desiredCapacity = undefined;

        const asgNodeId = autoScalingGroup.node.id;

        if (!this.asgToParamMap.has(asgNodeId)) {
          this.asgToParamMap.set(
            asgNodeId,
            new CfnParameter(this.stack, `MinInstancesInServiceFor${autoScalingGroup.app}`, {
              type: "Number",
              default: parseInt(cfnAutoScalingGroup.minSize),
              maxValue: parseInt(cfnAutoScalingGroup.maxSize) - 1,
            }),
          );
        }

        const minInstancesInService = this.asgToParamMap.get(asgNodeId)!;

        cfnAutoScalingGroup.cfnOptions.updatePolicy = {
          autoScalingRollingUpdate: {
            ...currentRollingUpdate,
            minInstancesInService: minInstancesInService.valueAsNumber,
          },
        };
      }
    }
  }
}

/**
 * An IAM Policy allowing the sending of a CloudFormation signal.
 *
 * @privateRemarks
 * Implemented as a singleton as the resources can only be tightened at most to the CloudFormation stack.
 */
class AsgRollingUpdatePolicy extends Policy {
  private static instance: AsgRollingUpdatePolicy | undefined;

  private constructor(scope: GuStack) {
    const { stackId } = scope;

    super(scope, "AsgRollingUpdatePolicy", {
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
    });
  }

  public static getInstance(stack: GuStack): AsgRollingUpdatePolicy {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new AsgRollingUpdatePolicy(stack);
    }

    return this.instance;
  }
}

export interface GuEc2AppExperimentalProps extends Omit<GuEc2AppProps, "updatePolicy"> {}

/**
 * An experimental pattern to instantiate an EC2 application that is updated entirely via CloudFormation.
 * It sets the update policy of the `AWS::AutoScaling::AutoScalingGroup` to `AutoScalingRollingUpdate`.
 * When a CloudFormation update is applied, the current instances in the ASG will be replaced.
 *
 * This pattern also updates the User Data, running some commands AFTER yours.
 * These changes are wrapped in start and end marking comments.
 *
 * This pattern does not enable for scaling events to trigger _during_ a deployment
 * as during testing it was found that scale-in events during deployment led to unpredictable service availability.
 *
 * If a deployment fails, for example when the healthcheck fails, CloudFormation will automatically rollback the changes.
 * This improves on the behaviour of Riff-Raff's `autoscaling` deployment which requires manual intervention on deployment failure.
 *
 * To update the application's code, a CloudFormation update must be triggered.
 * The best way to do this is to include the build number in the application artifact.
 * TODO test User Data includes a build number.
 *
 * @remarks
 * - The rate at which instances are replaced are conditional based on how scaled up the service is.
 *   The more an application is scaled, the longer it'll take to deploy.
 * - It is not necessary to use the `autoscaling` Riff-Raff deployment type in conjunction with this.
 *   Doing so won't break anything, however it'll lengthen the deployment time as instances will be rotated twice.
 *   Please remove it from any manually created `riff-raff.yaml` file.
 * - Your application should include a build number in its filename.
 *   This value will change across builds, and therefore create a CloudFormation template difference to be deployed.
 * - Requires the AWS CLI and `cfn-signal` binaries to be available on the instance, and on the `PATH`.
 *   AMIgo adds these via the `aws-tools` role.
 *
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate
 * @see https://github.com/guardian/testing-asg-rolling-update
 *
 * @experimental
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

        /*
        If a scale-in event fires during an `AutoScalingRollingUpdate` operation, the update could fail and rollback.
        For this reason, we suspend the `AlarmNotification` process, else availability of a service cannot be guaranteed.
        Consequently, services cannot scale-out during deployments.
        If AWS ever supports suspending scale-out and scale-in independently, we should allow scale-out.
         */
        suspendProcesses: [ScalingProcess.ALARM_NOTIFICATION],
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

    AsgRollingUpdatePolicy.getInstance(scope).attachToRole(role);

    /*
    `aws` is available via AMIgo baked AMIs.
    See https://github.com/guardian/amigo/tree/main/roles/aws-tools.
     */
    userData.addCommands(
      `# ${GuEc2AppExperimental.name} UserData Start`,
      `
      TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
      INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" "http://169.254.169.254/latest/meta-data/instance-id")

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

    // TODO Once out of experimental, instantiate this `Aspect` directly in `GuStack`.
    Aspects.of(scope).add(HorizontallyScalingDeploymentProperties.getInstance(scope));
  }
}
