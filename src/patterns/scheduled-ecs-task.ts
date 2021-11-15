import { Alarm, TreatMissingData } from "@aws-cdk/aws-cloudwatch";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import type { ISecurityGroup, IVpc } from "@aws-cdk/aws-ec2";
import type { IRepository } from "@aws-cdk/aws-ecr";
import {
  Cluster,
  Compatibility,
  ContainerImage,
  FargatePlatformVersion,
  LogDrivers,
  TaskDefinition,
} from "@aws-cdk/aws-ecs";
import type { Schedule } from "@aws-cdk/aws-events";
import { Rule } from "@aws-cdk/aws-events";
import { SfnStateMachine } from "@aws-cdk/aws-events-targets";
import type { PolicyStatement } from "@aws-cdk/aws-iam";
import { Topic } from "@aws-cdk/aws-sns";
import { IntegrationPattern, StateMachine } from "@aws-cdk/aws-stepfunctions";
import { EcsFargateLaunchTarget, EcsRunTask } from "@aws-cdk/aws-stepfunctions-tasks";
import { CfnOutput, Duration } from "@aws-cdk/core";
import type { NoMonitoring } from "../constructs/cloudwatch";
import type { GuStack } from "../constructs/core";
import type { Identity } from "../constructs/core/identity";
import { AppIdentity } from "../constructs/core/identity";
import { GuGetDistributablePolicyStatement } from "../constructs/iam";

/**
 * Configuration to determine what container to use for the task
 * For example, to run the task in the latest node container:
 *
 * ```typescript
 * const containerConfiguration = {
 *     id: 'node:latest'
 * }
 * ```
 *
 * Alternatively you can specify a repository and version, for example for an ECR repository:
 * ```typescript
 * import { Repository } from "@aws-cdk/aws-ecr";
 * const repository = new Repository(scope, `${app}-repository`, {
    repositoryName: app,
  });
 * const containerConfiguration = {
 *     repository: Repository.fromRepositoryArn("<repository arn>"),
 *     version: '1'
 * }
 * ```
 */

export type RepositoryContainer = {
  repository: IRepository;
  version: string;
  type: "repository";
};

export type RegistryContainer = {
  id?: string;
  type: "registry";
};

export type ContainerConfiguration = RepositoryContainer | RegistryContainer;

export type GuEcsTaskMonitoringProps = { snsTopicArn: string; noMonitoring: false };

/**
 * Configuration options for the [[`GuScheduledEcsTask`]] pattern.
 *
 * The `schedule` property determines when your task is invoked. For example, to invoke
 * the lambda every 5 minutes, use:
 * ```typescript
 * import { Schedule } from "@aws-cdk/aws-events";
 * import { Duration } from "@aws-cdk/core";
 *
 * const props = {
 *   // Other props here
 *   schedule: Schedule.rate(Duration.minutes(5)),
 * }
 * ```
 *
 * To invoke the task every weekday at 8am, use:
 * ```
 * import { Schedule } from "@aws-cdk/aws-events";
 *
 * const props = {
 *   // Other props here
 *   schedule: Schedule.expression("cron(0 8 ? * MON-FRI *)"),
 * }
 * ```
 *
 * See [[`ContainerConfiguration`]] for details of how to configure the container used to run the task.
 *
 * `taskTimeoutInMinutes` does what is says on the tin. The default timeout is 15 minutes.
 *
 * The `taskCommand` prop allows you to specify a command to run when the task starts (this can also be done via a CMD statement in
 * your Dockerfile). For example:
 *
 * const props = {
 *    //other props
 *    taskCommand: `aws s3 cp s3://${distbucket}/${stack}/${stage}/${app}/task.sh . && ./task.sh
    }
 *
 * It is advisable to configure alarms for when the job fails/times out. To do this specify the alarmSnsTopicArn prop.
 *
 * `customTaskPolicies` allows your task to interact with other AWS services. By default a task
 * will have read access to the distribution bucket for your account.
 *
 * You can specify security groups to apply to task using the `securityGroups` prop.
 *
 * You can also set the memory and cpu units for your task. See https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#task_size
 * for further details.
 *
 */
export interface GuScheduledEcsTaskProps extends Identity {
  vpc: IVpc;
  schedule: Schedule;
  containerConfiguration: ContainerConfiguration;
  taskTimeoutInMinutes?: number;
  cpu?: number;
  memory?: number;
  taskCommand?: string;
  monitoringConfiguration: NoMonitoring | GuEcsTaskMonitoringProps;
  securityGroups?: ISecurityGroup[];
  customTaskPolicies?: PolicyStatement[];
  scheduleEnabled?: boolean;
}

/**
 * Containers can be specified either via a repository and version or by container id (in which case it will
 * be fetched from docker hub).
 */
const getContainer = (config: ContainerConfiguration) => {
  if (config.type == "repository") {
    return ContainerImage.fromEcrRepository(config.repository, config.version);
  } else {
    return ContainerImage.fromRegistry(config.id ?? "ubuntu:focal");
  }
};

/**
 * Pattern which creates all of the resources needed to invoke a fargate task on a schedule.
 *
 * The task will be wrapped in a step function to allow for easier triggering and alarming on failure.
 *
 * For all configuration options, see [[`GuScheduledEcsTaskProps`]].
 *
 * Note that if your task reliably completes in less than 15 minutes then you should probably use a [[`GuScheduledLambda`]] instead. This
 * pattern was mainly created to work around the 15 minute lambda timeout.
 */
export class GuScheduledEcsTask {
  constructor(scope: GuStack, props: GuScheduledEcsTaskProps) {
    const timeout = props.taskTimeoutInMinutes ?? 15;

    // see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ecs-taskdefinition.html#cfn-ecs-taskdefinition-cpu for details
    const defaultCpu = 2048; // 2 cores and from 4-16GB memory
    const defaultMemory = 4096; // 4GB

    const cpu = props.cpu ?? defaultCpu;
    const memory = props.memory ?? defaultMemory;

    const cluster = new Cluster(scope, AppIdentity.suffixText(props, "Cluster"), {
      clusterName: `${props.app}-cluster-${props.stage}`,
      enableFargateCapacityProviders: true,
      vpc: props.vpc,
    });

    const taskDefinition = new TaskDefinition(scope, AppIdentity.suffixText(props, "TaskDefinition"), {
      compatibility: Compatibility.FARGATE,
      cpu: cpu.toString(),
      memoryMiB: memory.toString(),
      family: `${props.stack}-${props.stage}-${props.app}`,
    });

    taskDefinition.addContainer(AppIdentity.suffixText(props, "ScheduledTaskContainer"), {
      image: getContainer(props.containerConfiguration),
      entryPoint: props.taskCommand ? ["/bin/sh"] : undefined,
      command: props.taskCommand ? ["-c", `${props.taskCommand}`] : undefined, // if unset, falls back to CMD in docker file, or no command will be run
      cpu,
      memoryLimitMiB: props.memory,
      logging: LogDrivers.awsLogs({
        streamPrefix: props.app,
        logRetention: 14,
      }),
    });

    const distPolicy = new GuGetDistributablePolicyStatement(scope, { app: props.app });

    taskDefinition.addToTaskRolePolicy(distPolicy);
    (props.customTaskPolicies ?? []).forEach((p) => taskDefinition.addToTaskRolePolicy(p));

    const task = new EcsRunTask(scope, `${props.app}-task`, {
      cluster: cluster,
      launchTarget: new EcsFargateLaunchTarget({
        platformVersion: FargatePlatformVersion.LATEST,
      }),
      taskDefinition: taskDefinition,
      integrationPattern: IntegrationPattern.RUN_JOB,
      resultPath: "DISCARD",
      timeout: Duration.minutes(timeout),
      securityGroups: props.securityGroups ?? [],
    });

    const stateMachine = new StateMachine(scope, AppIdentity.suffixText(props, "StateMachine"), {
      definition: task,
      stateMachineName: `${props.app}-${props.stage}`,
    });

    const rule = new Rule(scope, AppIdentity.suffixText(props, "ScheduleRule"), {
      schedule: props.schedule,
      targets: [new SfnStateMachine(stateMachine)],
      enabled: props.scheduleEnabled === undefined ? true : props.scheduleEnabled,
    });

    if (!props.monitoringConfiguration.noMonitoring) {
      const alarmTopic = Topic.fromTopicArn(
        scope,
        AppIdentity.suffixText(props, "AlarmTopic"),
        props.monitoringConfiguration.snsTopicArn
      );
      const alarms = [
        {
          name: `${props.app}-execution-failed`,
          description: `${props.app}-${props.stage} job failed `,
          metric: stateMachine.metricFailed({
            period: Duration.hours(1),
            statistic: "sum",
          }),
        },
        {
          name: `${props.app}-timeout`,
          description: `${props.app}-${props.stage} job timed out `,
          metric: stateMachine.metricTimedOut({
            period: Duration.hours(1),
            statistic: "sum",
          }),
        },
      ];

      alarms.forEach((a) => {
        const alarm = new Alarm(scope, a.name, {
          alarmDescription: a.description,
          actionsEnabled: true,
          metric: a.metric,
          // default for comparisonOperator is GreaterThanOrEqualToThreshold
          threshold: 1,
          evaluationPeriods: 1,
          treatMissingData: TreatMissingData.NOT_BREACHING,
        });
        alarm.addAlarmAction(new SnsAction(alarmTopic));
        AppIdentity.taggedConstruct({ app: props.app }, alarm);
      });
    }

    // Tag all constructs with correct app tag
    [cluster, task, taskDefinition, stateMachine, rule].forEach((c) =>
      AppIdentity.taggedConstruct({ app: props.app }, c)
    );

    new CfnOutput(scope, AppIdentity.suffixText(props, "StateMachineArnOutput"), {
      value: stateMachine.stateMachineArn,
    });
  }
}
