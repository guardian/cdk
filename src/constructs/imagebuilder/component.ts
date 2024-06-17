import type { CfnComponentProps } from "aws-cdk-lib/aws-imagebuilder";
import { CfnComponent } from "aws-cdk-lib/aws-imagebuilder";
import type { GuStack } from "../core";

export class GuComponent extends CfnComponent {
  constructor(scope: GuStack, id: string, props: CfnComponentProps) {
    super(scope, id, props);
  }
}
