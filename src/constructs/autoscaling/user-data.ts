import type { S3DownloadOptions } from "@aws-cdk/aws-ec2";
import { UserData } from "@aws-cdk/aws-ec2";
import { Bucket } from "@aws-cdk/aws-s3";
import type { GuPrivateS3ConfigurationProps } from "../../utils/ec2";
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

export interface GuUserDataProps {
  distributable: GuUserDataS3DistributableProps;
  configuration?: GuPrivateS3ConfigurationProps;
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

  private downloadConfiguration(scope: GuStack, props: GuPrivateS3ConfigurationProps) {
    const localDirectory = `/etc/${scope.app}`;
    const bucketName = props.bucketName.valueAsString;
    const files = props.files;

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
