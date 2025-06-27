import type { IAspect } from "aws-cdk-lib";
import { Aspects, CfnParameter, Duration, Tags } from "aws-cdk-lib";
import { CfnAutoScalingGroup, CfnScalingPolicy, ScalingProcess, UpdatePolicy } from "aws-cdk-lib/aws-autoscaling";
import type { CfnPolicy } from "aws-cdk-lib/aws-iam";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { IConstruct } from "constructs";
import { MetadataKeys } from "../../constants";
import { GuAutoScalingGroup } from "../../constructs/autoscaling";
import type { GuStack } from "../../constructs/core";
import type { GuApplicationTargetGroup } from "../../constructs/loadbalancing";
import type { GuEc2AppProps } from "../../patterns";
import { GuEc2App } from "../../patterns";
import { isSingletonPresentInStack } from "../../utils/singleton";

interface AutoScalingRollingUpdateDurations {
  /**
   * The time between each check of an instance's health within the target group.
   */
  sleep: Duration;

  /**
   * Additional time to cover the time spent polling an instance's health within the target group before sending the CloudFormation signal.
   */
  buffer: Duration;
}

export const RollingUpdateDurations: AutoScalingRollingUpdateDurations = {
  sleep: Duration.seconds(5),
  buffer: Duration.minutes(1),
};

/**
 * Ensures the `AutoScalingRollingUpdate` of an AutoScaling Group has a `PauseTime` matching the healthcheck grace period.
 * It also ensures the `CreationPolicy` resource signal `Timeout` matches the healthcheck grace period.
 *
 * @internal
 *
 * @privateRemarks
 * The ASG healthcheck grace period is hard-coded by {@link GuEc2App}.
 * Customisation of this value is performed via an escape hatch.
 * An `Aspect` is the only way to observe any customisation.
 *
 * TODO Expose the healthcheck grace period as a property on {@link GuEc2App} and remove this `Aspect`.
 */
export class GuAutoScalingRollingUpdateTimeoutExperimental implements IAspect {
  public readonly stack: GuStack;
  private static instance: GuAutoScalingRollingUpdateTimeoutExperimental | undefined;

  private constructor(scope: GuStack) {
    this.stack = scope;
  }

  public static getInstance(stack: GuStack): GuAutoScalingRollingUpdateTimeoutExperimental {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuAutoScalingRollingUpdateTimeoutExperimental(stack);
    }
    return this.instance;
  }

  public visit(construct: IConstruct) {
    if (construct instanceof CfnAutoScalingGroup) {
      const currentRollingUpdate = construct.cfnOptions.updatePolicy?.autoScalingRollingUpdate;
      const currentCreationPolicy = construct.cfnOptions.creationPolicy;

      if (!construct.healthCheckGracePeriod) {
        throw new Error(`The healthcheck grace period not set for autoscaling group ${construct.node.id}.`);
      }

      const signalTimeoutSeconds = construct.healthCheckGracePeriod + RollingUpdateDurations.buffer.toSeconds();

      if (currentRollingUpdate) {
        construct.cfnOptions.updatePolicy = {
          autoScalingRollingUpdate: {
            ...currentRollingUpdate,
            pauseTime: Duration.seconds(
              Duration.parse(currentRollingUpdate.pauseTime ?? "0").toSeconds() + signalTimeoutSeconds,
            ).toIsoString(),
          },
        };
      }

      if (currentCreationPolicy) {
        construct.cfnOptions.creationPolicy = {
          ...currentCreationPolicy,
          resourceSignal: {
            ...currentCreationPolicy.resourceSignal,
            timeout: Duration.seconds(signalTimeoutSeconds).toIsoString(),
          },
        };
      }
    }
  }
}

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
export class GuHorizontallyScalingDeploymentPropertiesExperimental implements IAspect {
  public readonly stack: GuStack;
  public readonly asgToParamMap: Map<string, CfnParameter>;
  private static instance: GuHorizontallyScalingDeploymentPropertiesExperimental | undefined;

  private constructor(scope: GuStack) {
    this.stack = scope;
    this.asgToParamMap = new Map();
  }

  public static getInstance(stack: GuStack): GuHorizontallyScalingDeploymentPropertiesExperimental {
    if (!this.instance || !isSingletonPresentInStack(stack, this.instance)) {
      this.instance = new GuHorizontallyScalingDeploymentPropertiesExperimental(stack);
    }

    return this.instance;
  }

  public visit(construct: IConstruct) {
    //if (construct instanceof CfnScalingPolicy && construct.stack.stackId === this.stack.stackId) {
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
          const cfnParameterName = getAsgRollingUpdateCfnParameterName(autoScalingGroup);
          this.asgToParamMap.set(
            asgNodeId,
            new CfnParameter(this.stack, cfnParameterName, {
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

export function getAsgRollingUpdateCfnParameterName(autoScalingGroup: GuAutoScalingGroup) {
  const { app } = autoScalingGroup;
  return `MinInstancesInServiceFor${app.replaceAll("-", "")}`;
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

export interface GuEc2AppExperimentalProps extends Omit<GuEc2AppProps, "updatePolicy"> {
  /**
   * Which application build to run.
   * This will typically match the build number provided by CI.
   *
   * @example
   * process.env.GITHUB_RUN_NUMBER
   */
  buildIdentifier: string;
  /**
   * The amount of time that newly launched instances will spend warming-up / serving fewer requests than other instances.
   * The range is 30-900 seconds (15 minutes). The default is 0 seconds (disabled).
   *
   * See https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html#slow-start-mode
   * for more details.
   *
   * We recommend enabling this setting if you run a high-traffic service, particularly if it is JVM-based.
   *
   * Note that there is a trade-off between reliability and speed here; a longer duration will give new instances
   * more time to warm-up, but it will also slow down deployments and scale-up events.
   */
  slowStartDuration?: Duration;
}

/**
 * Configures the rolling update policy for the autoscaling group.
 *
 * Most applications should not need to instantiate this class directly as this policy is set by GuEc2AppExperimental.
 *
 * If you need to use this class for a service other than MAPI, please speak to DevX about your use-case first.
 */
export class GuRollingUpdatePolicyExperimental {
  static getPolicy(
    maximumInstances: number,
    minimumInstances?: number,
    slowStartDuration: Duration = Duration.seconds(0),
  ) {
    return UpdatePolicy.rollingUpdate({
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
      /*
      Note: this is increased via an Aspect which also takes healthcheck grace period into account.

      It was easier to pass the slow start duration through here rather than trying to do this via the
      GuAutoScalingRollingUpdateTimeoutExperimental aspect.

      If we do this via the aspect then we need to find all mappings between ASGs and target groups and then
      get the relevant slow start duration for each. This is probably possible but would be reasonably complex.
      However, it's worth mentioning that by taking this approach we open up a small risk that things will not work
      as expected if users enable slow start via a different mechanism (e.g. by modifying the target group outside
      the pattern).
       */
      pauseTime: slowStartDuration,
    });
  }
}

export interface GuRoleForRollingUpdateExperimentalProps {
  autoScalingGroup: GuAutoScalingGroup;
}

/**
 * Grants the role associated with your autoscaling group the necessary permissions for the rolling update deployment
 * mechanism.
 *
 * Most applications should not need to instantiate this class directly as these permission changes are granted
 * by GuEc2AppExperimental.
 *
 * If you need to use this class for a service other than MAPI, please speak to DevX about your use-case first.
 */
export class GuRoleForRollingUpdateExperimental {
  constructor(scope: GuStack, props: GuRoleForRollingUpdateExperimentalProps) {
    const policy = AsgRollingUpdatePolicy.getInstance(scope);
    policy.attachToRole(props.autoScalingGroup.role);

    // Create the Policy with necessary permissions first.
    // Then create the ASG that requires the permissions.
    const cfnPolicy = policy.node.defaultChild as CfnPolicy;
    const cfnAutoScalingGroup = props.autoScalingGroup.node.defaultChild as CfnAutoScalingGroup;
    cfnAutoScalingGroup.addDependency(cfnPolicy);
  }
}

export interface GuUserDataForRollingUpdateExperimentalProps {
  autoScalingGroup: GuAutoScalingGroup;
  targetGroup: GuApplicationTargetGroup;
  applicationPort: number;
  buildIdentifier: string;
  slowStartDuration?: Duration;
}

/**
 * Modifies the user-data script (which runs whenever an instance is launched) to make it compatible with the new
 * rolling update deployment mechanism.
 *
 * Most applications should not need to instantiate this class directly as these user-data changes are already made
 * by GuEc2AppExperimental.
 *
 * If you need to use this class for a service other than MAPI, please speak to DevX about your use-case first.
 */
export class GuUserDataForRollingUpdateExperimental {
  constructor(scope: GuStack, props: GuUserDataForRollingUpdateExperimentalProps) {
    const { region, stackId } = scope;
    const { autoScalingGroup, targetGroup, applicationPort, buildIdentifier, slowStartDuration } = props;
    const cfnAutoScalingGroup = autoScalingGroup.node.defaultChild as CfnAutoScalingGroup;

    /*
      `aws` is available via AMIgo baked AMIs.
      See https://github.com/guardian/amigo/tree/main/roles/aws-tools.
       */
    autoScalingGroup.userData.addCommands(
      `# ${GuEc2AppExperimental.name} Instance Health Check Start`,
      `
      TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
      INSTANCE_ID=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" "http://169.254.169.254/latest/meta-data/instance-id")

      STATE=$(aws elbv2 describe-target-health \
        --target-group-arn ${targetGroup.targetGroupArn} \
        --region ${region} \
        --targets Id=$INSTANCE_ID,Port=${applicationPort} \
        --query "TargetHealthDescriptions[0].TargetHealth.State")

      until [ "$STATE" == "\\"healthy\\"" ]; do
        echo "Instance running build ${buildIdentifier} not yet healthy within target group. Current state $STATE. Sleeping..."
        sleep ${RollingUpdateDurations.sleep.toSeconds()}
        STATE=$(aws elbv2 describe-target-health \
          --target-group-arn ${targetGroup.targetGroupArn} \
          --region ${region} \
          --targets Id=$INSTANCE_ID,Port=${applicationPort} \
          --query "TargetHealthDescriptions[0].TargetHealth.State")
      done

      echo "Instance running build ${buildIdentifier} is healthy in target group."
      `,
      `# ${GuEc2AppExperimental.name} Instance Health Check End`,
    );

    if (slowStartDuration) {
      const slowStartInSeconds = slowStartDuration.toSeconds().toString();
      targetGroup.setAttribute("slow_start.duration_seconds", slowStartInSeconds);
      autoScalingGroup.userData.addCommands(
        `# ${GuEc2AppExperimental.name} SlowStart Wait Period Start`,
        `
        echo "Sleeping for ${slowStartInSeconds} seconds while instance running build ${buildIdentifier} warms up..."
        sleep ${slowStartInSeconds}s
        echo "Instance running build ${buildIdentifier} should have warmed up by now..."

        STATE=$(aws elbv2 describe-target-health \
        --target-group-arn ${targetGroup.targetGroupArn} \
        --region ${region} \
        --targets Id=$INSTANCE_ID,Port=${applicationPort} \
        --query "TargetHealthDescriptions[0].TargetHealth.State")

        if [ "$STATE" == "\\"healthy\\"" ]; then
           echo "Instance running build ${buildIdentifier} is ready to start serving a normal percentage of requests"
        else
          echo "Instance running build ${buildIdentifier} was not healthy after warm-up period; a failure signal will be sent"
          exit 1
        fi
        `,
        `# ${GuEc2AppExperimental.name} SlowStart Wait Period End`,
      );
    }

    autoScalingGroup.userData.addOnExitCommands(
      `
        cfn-signal --stack ${stackId} \
          --resource ${cfnAutoScalingGroup.logicalId} \
          --region ${region} \
          --exit-code $exitCode || echo 'Failed to send Cloudformation Signal'
        `,
    );

    // If https://github.com/guardian/devx-logs is used, this tag will be added as a marker to logs in Central ELK.
    Tags.of(autoScalingGroup.instanceLaunchTemplate).add(MetadataKeys.BUILD_IDENTIFIER, buildIdentifier, {
      applyToLaunchedInstances: true,
    });
  }
}

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
    const { applicationPort, buildIdentifier, slowStartDuration } = props;

    const slowStartDurationInSeconds = slowStartDuration?.toSeconds();
    if (slowStartDurationInSeconds && (slowStartDurationInSeconds < 30 || slowStartDurationInSeconds > 900)) {
      throw new Error("Slow start duration must be between 30 and 900 seconds");
    }

    super(scope, {
      ...props,
      // Note: if the service uses horizontal scaling, minimumInstances is overridden by an Aspect (to prevent accidental scale downs!)
      updatePolicy: GuRollingUpdatePolicyExperimental.getPolicy(maximumInstances, minimumInstances, slowStartDuration),
    });

    const { autoScalingGroup, targetGroup } = this;
    const cfnAutoScalingGroup = autoScalingGroup.node.defaultChild as CfnAutoScalingGroup;

    // Note: if the service uses horizontal scaling, this property is unset by an Aspect (to prevent accidental scale downs!)
    cfnAutoScalingGroup.desiredCapacity = minimumInstances.toString();

    // This is used when an ASG is first created; it is not needed to support the new deployment mechanism
    cfnAutoScalingGroup.cfnOptions.creationPolicy = {
      autoScalingCreationPolicy: {
        minSuccessfulInstancesPercent: 100,
      },
      resourceSignal: {
        count: minimumInstances,
      },
    };

    new GuRoleForRollingUpdateExperimental(scope, { autoScalingGroup });
    new GuUserDataForRollingUpdateExperimental(scope, {
      autoScalingGroup,
      targetGroup,
      applicationPort,
      buildIdentifier,
      slowStartDuration,
    });

    // TODO Once out of experimental, instantiate these `Aspect`s directly in `GuStack`.
    Aspects.of(scope).add(GuAutoScalingRollingUpdateTimeoutExperimental.getInstance(scope));
    Aspects.of(scope).add(GuHorizontallyScalingDeploymentPropertiesExperimental.getInstance(scope));
  }
}
