import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { IStream } from "aws-cdk-lib/aws-kinesis";
import type { GuStack } from "../../core";
import { GuPolicy } from "./base-policy";

export interface KCLApplication {
  stream: IStream;
  applicationName: string;
}

const kinesisActions: string[] = [
  "DescribeStream",
  "DescribeStreamSummary",
  "RegisterStreamConsumer",
  "GetRecords",
  "GetShardIterator",
  "ListShards",
];

const kinesisEnhancedFanOutActions: string[] = ["SubscribeToShard", "DescribeStreamConsumer"];

const actionsOnAllTables: string[] = [
  "Scan",
  "CreateTable", // Allow KCL creating the lease, metrics, and coordinator tables - see https://github.com/guardian/cdk/pull/2578#discussion_r1954061397
  "DescribeTable",
  "GetItem",
  "PutItem",
];

const additionalLeaseTableActions: string[] = ["UpdateTable", "UpdateItem", "DeleteItem"];

/**
 * Creates an `AWS::IAM::Policy` to grant all the required permissions for the Kinesis Client Library
 * (https://github.com/awslabs/amazon-kinesis-client) - specifically for KCL v3, which requires many
 * additional permissions over KCL v2.
 *
 * @see https://docs.aws.amazon.com/streams/latest/dev/kcl-iam-permissions.html
 */
export class GuKCLPolicy extends GuPolicy {
  constructor(scope: GuStack, props: KCLApplication) {
    function allow(actionType: string, actions: string[], resources: string[]): PolicyStatement {
      return new PolicyStatement({
        effect: Effect.ALLOW,
        actions: actions.map((a) => `${actionType}:${a}`),
        resources: resources.map((r) => `arn:aws:${actionType}:${scope.region}:${scope.account}:${r}`),
      });
    }

    function allowDynamoDB(actions: string[], tableOrIndexNames: string[]): PolicyStatement {
      return allow(
        "dynamodb",
        actions,
        tableOrIndexNames.map((name) => `table/${name}`),
      );
    }

    const leaseTable = props.applicationName;
    const metricsTable = `${props.applicationName}-WorkerMetricStats`;
    const coordinatorTable = `${props.applicationName}-CoordinatorState`;

    super(scope, `GuKCLPolicy${props.applicationName}`, {
      statements: [
        allow("kinesis", kinesisActions, [`stream/${props.stream.streamName}`]),
        allow("kinesis", kinesisEnhancedFanOutActions, [`stream/${props.stream.streamName}/consumer/*`]),
        allowDynamoDB(actionsOnAllTables, [leaseTable, metricsTable, coordinatorTable]),
        allowDynamoDB(additionalLeaseTableActions, [leaseTable]),
        allowDynamoDB(["Query"], [`${leaseTable}/index/*`]),
        allow("cloudwatch", ["PutMetricData"], ["*"]),
      ],
    });
  }
}
