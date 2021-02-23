import type { S3DownloadOptions } from "@aws-cdk/aws-ec2";
import { UserData } from "@aws-cdk/aws-ec2";
import { Bucket } from "@aws-cdk/aws-s3";
import type { GuStack } from "../core";

/**
 * Where to download a distributable from.
 * We'll look for `fileName` on the path "bucket/stack/stage/app/<fileName>".
 * `executionStatement` will be something like "dpkg -i application.deb` or `service foo start`.
 */
export interface GuUserDataS3DistributableProps {
  bucketName: string;
  fileName: string;
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

  get userData(): UserData {
    return this._userData;
  }

  private downloadDistributable(scope: GuStack, props: GuUserDataS3DistributableProps) {
    const localDirectory = `/${scope.app}`;
    const { bucketName, fileName } = props;
    const bucketKey = [scope.stack, scope.stage, scope.app, fileName].join("/");

    const bucket = Bucket.fromBucketAttributes(scope, "DistributionBucket", {
      bucketName,
    });

    this.addS3DownloadCommand({
      bucket: bucket,
      bucketKey,
      localFile: `${localDirectory}/${fileName}`,
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
      this.downloadDistributable(scope, props.distributable);
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
