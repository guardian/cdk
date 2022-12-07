import type { IAspect } from "aws-cdk-lib";
import { Annotations } from "aws-cdk-lib";
import { CfnInclude } from "aws-cdk-lib/cloudformation-include";
import type { IConstruct } from "constructs";
import { LibraryInfo } from "../constants";

/**
 * An Aspect to remind users to check for stateful resources when migrating a YAML/JSON template.
 */
export class CfnIncludeReporter implements IAspect {
  public visit(node: IConstruct) {
    if (node instanceof CfnInclude) {
      Annotations.of(node).addWarning(
        `As you're migrating a YAML/JSON template to ${LibraryInfo.NAME}, be sure to check for any stateful resources! See https://github.com/guardian/cdk/blob/main/docs/stateful-resources.md.`
      );
    }
  }
}
