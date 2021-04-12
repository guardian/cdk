/**
 * A small wrapper around `console`, printing messages as YAML comments.
 *
 * When a stack is synthesized, AWS CDK will:
 *   - print the resulting CloudFormation template as YAML to the console
 *   - save the resulting CloudFormation template as JSON to disk
 *
 * In addition, any messages from `Logger` will be echoed on the console.
 *
 * The AWS CDK library does not support synthesizing a YAML template to disk.
 * The only way to achieve this is is to redirect the result of `cdk synth` to disk.
 * For example:
 *
 * ```console
 * cdk synth > cloudformation.yaml
 * ```
 *
 * For this reason, these messages will have a "# " prefix.
 * This results in `cloudformation.yaml` still being valid YAML.
 *
 * For example:
 *
 * ```yaml
 * # GuStack has 'migratedFromCloudFormation' set to false. MyDatabase is a stateful construct, it's logicalId will be auto-generated and AWS will create a new resource.
 * Parameters:
 *   Stage:
 *     Type: String
 *     Default: CODE
 *     AllowedValues:
 *       - CODE
 *       - PROD
 *     Description: Stage name
 * Resources:
 *   MyDatabaseA1B2C3D4:
 *     Type: AWS::RDS::DBInstance
 * ```
 *
 * Messages will only get printed if NODE_ENV is not test.
 * This is to reduce noise in a test environment.
 * Jest's `--silent` flag isn't used as that has a global impact.
 *
 * See https://github.com/aws/aws-cdk/issues/2965.
 */
export class Logger {
  private static isTest = process.env.NODE_ENV === "test";

  private static stringAsYamlComment(message: string): string {
    return `# ${message}`;
  }

  static info(message: string): void {
    !Logger.isTest && console.info(Logger.stringAsYamlComment(message));
  }

  static warn(message: string): void {
    !Logger.isTest && console.warn(Logger.stringAsYamlComment(message));
  }
}
