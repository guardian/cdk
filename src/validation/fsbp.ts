import path from "path";
import { CfnGuardValidator } from "@cdklabs/cdk-validator-cfnguard";
import type { IPolicyValidationContext, IPolicyValidationPlugin, PolicyValidationPluginReport } from "aws-cdk-lib";

// Vendored from https://github.com/aws-cloudformation/aws-guard-rules-registry, selecting the rules that map to FSBP controls.
const GUARD_RULES_DIR = path.join(__dirname, "..", "..", "guard-rules");

// The FSBP control checked by each rule in `guard-rules`.
const RULE_CONTROLS: Record<string, string> = {
  INCOMING_SSH_DISABLED: "EC2.19",
  RESTRICTED_INCOMING_TRAFFIC: "EC2.19",
  ELASTICSEARCH_IN_VPC_ONLY: "ES.2",
  KMS_NO_WILDCARD_PRINCIPAL: "KMS.5",
  LAMBDA_FUNCTION_PUBLIC_ACCESS_PROHIBITED: "Lambda.1",
  LAMBDA_NO_WILDCARD_PRINCIPALS: "Lambda.1",
  OPENSEARCH_IN_VPC_ONLY: "Opensearch.2",
  RDS_INSTANCE_PUBLIC_ACCESS_CHECK: "RDS.2",
  S3_BUCKET_PUBLIC_READ_PROHIBITED: "S3.2",
  S3_BUCKET_PUBLIC_READ_ACL: "S3.2",
  S3_BUCKET_PUBLIC_WRITE_PROHIBITED: "S3.3",
  S3_BUCKET_NO_PUBLIC_RW_ACL: "S3.3",
  SNS_TOPICPOLICY_NO_WILDCARD_PRINCIPAL: "SNS.4",
  SQS_QUEUEPOLICY_NO_WILDCARD_PRINCIPAL: "SQS.3",
};

// From https://docs.aws.amazon.com/securityhub/latest/userguide/fsbp-standard.html
const CONTROL_TITLES: Record<string, string> = {
  "EC2.19": "Security groups should not allow unrestricted access to ports with high risk",
  "ES.2": "Elasticsearch domains should not be publicly accessible",
  "KMS.5": "KMS keys should not be publicly accessible",
  "Lambda.1": "Lambda function policies should prohibit public access",
  "Opensearch.2": "OpenSearch domains should not be publicly accessible",
  "RDS.2": "RDS DB instances should prohibit public access",
  "S3.2": "S3 general purpose buckets should block public read access",
  "S3.3": "S3 general purpose buckets should block public write access",
  "SNS.4": "SNS topic access policies should not allow public access",
  "SQS.3": "SQS queue access policies should not allow public access",
};

/**
 * Fails synthesis when a template breaches an AWS Foundational Security Best Practices (FSBP) control,
 * as checked by the cfn-guard rules in `guard-rules`.
 * Acknowledge a violation with `Validations.of(construct).acknowledge({ id: "FSBP::S3_BUCKET_PUBLIC_READ_PROHIBITED", reason })`.
 */
export class GuFsbpValidationPlugin implements IPolicyValidationPlugin {
  // Shared so that registering from every stack is harmless: aws-cdk-lib dedupes plugins by instance.
  public static readonly instance = new GuFsbpValidationPlugin();

  // Also the prefix of acknowledgement IDs, e.g. `FSBP::S3_BUCKET_PUBLIC_READ_PROHIBITED`.
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
