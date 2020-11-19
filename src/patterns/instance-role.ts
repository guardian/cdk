import { ServicePrincipal } from "@aws-cdk/aws-iam";
import type { Stack } from "@aws-cdk/core";
import type { GuPolicy } from "../constructs/iam";
import { GuGetS3ObjectPolicy, GuLogShippingPolicy, GuRole, GuSSMRunCommandPolicy } from "../constructs/iam";

export interface InstanceRoleProps {
  artifactBucket: string;
  additionalPolicies?: GuPolicy[];
  loggingStreamName?: string;
}

export class InstanceRole extends GuRole {
  private policies: GuPolicy[];

  constructor(scope: Stack, props: InstanceRoleProps) {
    super(scope, "InstanceRole", {
      overrideId: true,
      path: "/",
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });

    this.policies = [
      new GuSSMRunCommandPolicy(scope, "SSMRunCommandPolicy", { overrideId: true }),
      new GuGetS3ObjectPolicy(scope, "GetDistributablesPolicy", { overrideId: true, bucket: props.artifactBucket }),
      ...(props.loggingStreamName
        ? [
            new GuLogShippingPolicy(scope, "LogShippingPolicy", {
              overrideId: true,
              kinesisStreamName: props.loggingStreamName,
            }),
          ]
        : []),
      ...(props.additionalPolicies ? props.additionalPolicies : []),
    ];

    this.policies.forEach((p) => p.attachToRole(this));
  }
}
