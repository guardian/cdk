import { Alarm, TreatMissingData } from "@aws-cdk/aws-cloudwatch";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import type { ISecurityGroup } from "@aws-cdk/aws-ec2";
import type { IRepository } from "@aws-cdk/aws-ecr";
import type { ICluster } from "@aws-cdk/aws-ecs";
import { Compatibility, ContainerImage, FargatePlatformVersion, LogDrivers, TaskDefinition } from "@aws-cdk/aws-ecs";
import type { Schedule } from "@aws-cdk/aws-events";
import { Rule } from "@aws-cdk/aws-events";
import { SfnStateMachine } from "@aws-cdk/aws-events-targets";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { Topic } from "@aws-cdk/aws-sns";
import { IntegrationPattern, StateMachine } from "@aws-cdk/aws-stepfunctions";
import { EcsFargateLaunchTarget, EcsRunTask } from "@aws-cdk/aws-stepfunctions-tasks";
import { CfnOutput, Duration } from "@aws-cdk/core";
import { GuDistributionBucketParameter } from "../constructs/core";
import type { GuStack } from "../constructs/core";
import type { Identity } from "../constructs/core/identity";

export interface GuScheduledEcsTaskProps extends Identity {
  cluster: ICluster;
  schedule: Schedule;
  taskTimeoutInMinutes?: number;
  cpu?: number;
  memory?: number;
  customCommand?: string;
  alarmSnsTopicArn: string;
  containerId?: string;
  repository?: IRepository;
  containerVersion?: string;
  securityGroups: ISecurityGroup[];
  customTaskPolicies?: PolicyStatement[];
}

const noCommandProvided = `echo "No command provided"`;

const getContainer = (repository?: IRepository, containerVersion?: string, containerId?: string) => {
  const ecrContainer = containerVersion && repository && ContainerImage.fromEcrRepository(repository, containerVersion);

  const id = containerId ?? "ubuntu:focal";

  if (ecrContainer) {
    return ecrContainer;
  } else {
    return ContainerImage.fromRegistry(id);
  }
};

export class GuScheduledEcsTask {
  constructor(scope: GuStack, props: GuScheduledEcsTaskProps) {
    const distBucket = GuDistributionBucketParameter.getInstance(scope).valueAsString;

    const alarmTopic = Topic.fromTopicArn(scope, "ScheduledJobAlarmTopic", props.alarmSnsTopicArn);
    const timeout = props.taskTimeoutInMinutes ?? 5;

    const cpu = props.cpu ?? 2048;
    const memory = props.memory ?? 4096;
    const taskDefinition = new TaskDefinition(scope, "TaskDefinition", {
      compatibility: Compatibility.FARGATE,
      cpu: cpu.toString(),
      memoryMiB: memory.toString(),
    });

    taskDefinition.addContainer("scheduled-task-container", {
      image: getContainer(props.repository, props.containerVersion, props.containerId),
      entryPoint: ["/bin/sh"],
      command: ["-c", `${props.customCommand ?? noCommandProvided}`],
      cpu,
      memoryLimitMiB: props.memory,
      logging: LogDrivers.awsLogs({
        streamPrefix: props.app,
        logRetention: 14,
      }),
    });

    const fetchArtifact = new PolicyStatement();
    fetchArtifact.addActions("s3:GetObject", "s3:HeadObject");
    fetchArtifact.addResources(`arn:aws:s3:::${distBucket}/*`);
    taskDefinition.addToTaskRolePolicy(fetchArtifact);
    (props.customTaskPolicies ?? []).forEach((p) => taskDefinition.addToTaskRolePolicy(p));

    const task = new EcsRunTask(scope, "task", {
      cluster: props.cluster,
      launchTarget: new EcsFargateLaunchTarget({
        platformVersion: FargatePlatformVersion.LATEST,
      }),
      taskDefinition: taskDefinition,
      integrationPattern: IntegrationPattern.RUN_JOB,
      resultPath: "DISCARD",
      timeout: Duration.minutes(timeout),
      securityGroups: props.securityGroups,
    });

    const stateMachine = new StateMachine(scope, "StateMachine", {
      definition: task,
      stateMachineName: `${props.app}-${props.stage}`,
    });

    new Rule(scope, "ScheduleRule", {
      schedule: props.schedule,
      targets: [new SfnStateMachine(stateMachine)],
    });

    const alarms = [
      {
        name: "ExecutionsFailedAlarm",
        description: `${props.app}-${props.stage} job failed `,
        metric: stateMachine.metricFailed({
          period: Duration.hours(1),
          statistic: "sum",
        }),
      },
      {
        name: "TimeoutAlarm",
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
    });

    new CfnOutput(scope, "StateMachineArn", {
      value: stateMachine.stateMachineArn,
    });
  }
}
