import type { App } from "@aws-cdk/core";
import type { GuStackProps } from "@guardian/cdk/lib/constructs/core";
import { GuDistributionBucketParameter, GuStack } from "@guardian/cdk/lib/constructs/core";

export class IntegrationTestStack extends GuStack {
  constructor(scope: App, id: string, props: GuStackProps) {
    super(scope, id, props);
    GuDistributionBucketParameter.getInstance(this);
  }
}
