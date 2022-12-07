import type { IAspect } from "aws-cdk-lib";
import { Annotations, CfnParameter } from "aws-cdk-lib";
import type { IConstruct } from "constructs";

/**
 * An Aspect to remind users to check Parameters to ensure Riff-Raff can successfully deploy the stack.
 */
export class CfnParameterReporter implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof CfnParameter) {
      const defaultValue = node.default as string;
      const hasDefault = !!defaultValue;
      const isSsmParameter = node.type.startsWith("AWS::SSM::Parameter::Value");

      if (isSsmParameter && hasDefault) {
        Annotations.of(node.stack).addInfo(
          `Stack reads the SSM Parameter '${defaultValue}'. Ensure it exists prior to deployment.`
        );
      }
    }
  }
}
