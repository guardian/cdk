import type { S3DownloadOptions } from "@aws-cdk/aws-ec2";
import { UserData } from "@aws-cdk/aws-ec2";
import { Bucket } from "@aws-cdk/aws-s3";
import type { GuDistributionBucketParameter, GuStack } from "../core";

/**
 * Where to download a distributable from.
 * We'll look for `fileName` on the path "bucket/stack/stage/app/<fileName>".
 * `executionStatement` will be something like "dpkg -i application.deb` or `service foo start`.
 */
export interface GuUserDataS3DistributableProps {
  bucket: GuDistributionBucketParameter;
  fileName: string;
  executionStatement: string; // TODO can we detect this and auto generate it? Maybe from the file extension?
}

/**
 * Where to download configuration from.
 * `files` are paths from the root of the bucket.
 *   TODO change this once we have defined best practice for configuration.
 */
export interface GuUserDataS3ConfigurationProps {
  bucketName: string;
  files: string[];
}

export interface GuUserDataProps {
  distributable: GuUserDataS3DistributableProps;
  configuration?: GuUserDataS3ConfigurationProps;

  /**
   * Statements to run after downloading configuration but before the executionStatement in [[GuUserDataS3DistributableProps]]
   */
  additionalStatements?: string[];
}

/**
 * An abstraction over UserData to simplify its creation.
 * Especially useful for simple user data where we:
 *   - (optional) download config
 *   - download distributable
 *   - execute distributable
 */
export class GuUserData {
  private readonly _userData: UserData;

  /**
   * A helper function to make user data strings easier to write.
   *
   * Example usage:
   * ```typescript
   * const additionalStatements = GuUserData.stripMargin`
   *   |mkdir /etc/gu
   *   |cat > /etc/gu/my-application.conf <<-'EOF'
   *   |  include "application"
   *   |EOF
   *   |`;
   * ```
   *
   * @param template a template string
   * @param args extra arguments
   */
  static stripMargin = (template: TemplateStringsArray, ...args: unknown[]): string => {
    const result = template.reduce((acc, part, i) => [acc, args[i - 1], part].join(""));
    return result.replace(/\r?(\n)\s*\|/g, "$1");
  };

  get userData(): UserData {
    return this._userData;
  }

  private downloadDistributable(scope: GuStack, props: GuUserDataS3DistributableProps) {
    const localDirectory = `/${scope.app}`;
    const bucketKey = [scope.stack, scope.stage, scope.app, props.fileName].join("/");

    const bucket = Bucket.fromBucketAttributes(scope, "DistributionBucket", {
      bucketName: props.bucket.valueAsString,
    });

    this.addS3DownloadCommand({
      bucket,
      bucketKey,
      localFile: `${localDirectory}/${props.fileName}`,
    });
  }

  private downloadConfiguration(scope: GuStack, props: GuUserDataS3ConfigurationProps) {
    const localDirectory = `/etc/${scope.app}`;
    const { bucketName, files } = props;

    const bucket = Bucket.fromBucketAttributes(scope, `${scope.app}ConfigurationBucket`, {
      bucketName,
    });

    files.forEach((bucketKey) => {
      const fileName = bucketKey.split("/").slice(-1)[0];

      this.addS3DownloadCommand({
        bucket,
        bucketKey,
        localFile: `${localDirectory}/${fileName}`,
      });
    });
  }

  // eslint-disable-next-line custom-rules/valid-constructors -- TODO only lint for things that extend IConstruct
  constructor(scope: GuStack, props?: GuUserDataProps) {
    this._userData = UserData.forLinux();

    if (props) {
      props.configuration && this.downloadConfiguration(scope, props.configuration);
      props.additionalStatements && this.addCommands(...props.additionalStatements);
      this.downloadDistributable(scope, props.distributable);
      this.addCommands(props.distributable.executionStatement);
    }
  }

  addCommands(...commands: string[]): GuUserData {
    this._userData.addCommands(...commands);
    return this;
  }

  addS3DownloadCommand(params: S3DownloadOptions): GuUserData {
    this._userData.addS3DownloadCommand(params);
    return this;
  }
}
