import * as cdk from '@aws-cdk/core';

export interface CdkProps {
  // Define construct properties here
}

export class Cdk extends cdk.Construct {

  constructor(scope: cdk.Construct, id: string, props: CdkProps = {}) {
    super(scope, id);

    // Define construct contents here
  }
}
