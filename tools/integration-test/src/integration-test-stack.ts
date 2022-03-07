import { GuDistributionBucketParameter, GuStack } from "@guardian/cdk/lib/constructs/core";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import type { App } from "aws-cdk-lib";

export class IntegrationTestStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);
    GuDistributionBucketParameter.getInstance(this);
  }
}
