import path from "path";
import { CfnGuardValidator } from "@cdklabs/cdk-validator-cfnguard";
import type { IPolicyValidationContext, IPolicyValidationPlugin, PolicyValidationPluginReport } from "aws-cdk-lib";

// Vendored from https://github.com/aws-cloudformation/aws-guard-rules-registry, selecting the rules that map to FSBP controls.
const GUARD_RULES_DIR = path.join(__dirname, "..", "..", "guard-rules");

// The FSBP control checked by each rule in `guard-rules`.
const RULE_CONTROLS: Record<string, string> = {
  S3_BUCKET_PUBLIC_WRITE_PROHIBITED: "S3.3",
};

// From https://docs.aws.amazon.com/securityhub/latest/userguide/fsbp-standard.html
const CONTROL_TITLES: Record<string, string> = {
  "S3.3": "S3 general purpose buckets should block public write access",
};

/**
 * Fails synthesis when a template breaches an AWS Foundational Security Best Practices (FSBP) control,
 * as checked by the cfn-guard rules in `guard-rules`.
 * Acknowledge a violation with `Validations.of(construct).acknowledge({ id: "FSBP::S3_BUCKET_PUBLIC_WRITE_PROHIBITED", reason })`.
 */
export class GuFsbpValidationPlugin implements IPolicyValidationPlugin {
  // Shared so that registering from every stack is harmless: aws-cdk-lib dedupes plugins by instance.
  public static readonly instance = new GuFsbpValidationPlugin();

  // Also the prefix of acknowledgement IDs, e.g. `FSBP::S3_BUCKET_PUBLIC_WRITE_PROHIBITED`.
  public readonly name = "FSBP";

  // Created lazily, as `CfnGuardValidator` throws on platforms without a bundled cfn-guard binary.
  private validator?: CfnGuardValidator;

  public validate(context: IPolicyValidationContext): PolicyValidationPluginReport {
    this.validator ??= new CfnGuardValidator({ controlTowerRulesEnabled: false, rules: [GUARD_RULES_DIR] });
    const { success, violations } = this.validator.validate(context);
    return {
      success,
      violations: violations.map((violation) => {
        const control = RULE_CONTROLS[violation.ruleName];
        const [service, number] = control?.toLowerCase().split(".") ?? [];
        return {
          ...violation,
          // Explicit, as aws-cdk-lib treats a violation without a severity as passing once any rule has been acknowledged.
          severity: "error",
          // Replaced, as the rules' own messages are often missing or inaccurate.
          ...(control && {
            description: `${control}: ${CONTROL_TITLES[control]}`,
            fix: `See https://docs.aws.amazon.com/securityhub/latest/userguide/${service}-controls.html#${service}-${number}`,
          }),
        };
      }),
    };
  }
}
