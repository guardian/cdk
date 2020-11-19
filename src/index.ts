import { Construct } from "@aws-cdk/core";

export interface CdkProps {
  name?: string;
}

export class Cdk extends Construct {
  constructor(scope: Construct, id: string, props: CdkProps = {}) {
    super(scope, id);

    // Define construct contents here
  }
}
