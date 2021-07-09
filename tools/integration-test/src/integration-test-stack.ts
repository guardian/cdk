import type { App } from "@aws-cdk/core";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuDistributionBucketParameter, GuStack, GuVpcParameter } from "@guardian/cdk/lib/constructs/core";
import { GuVpc } from "@guardian/cdk/lib/constructs/ec2";

export class IntegrationTestStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);
    GuDistributionBucketParameter.getInstance(this);

    GuVpc.fromId(this, "vpc", { vpcId: GuVpcParameter.getInstance(this).valueAsString });
  }
}
