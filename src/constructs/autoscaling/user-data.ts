import { UserData } from "aws-cdk-lib/aws-ec2";
import type { S3DownloadOptions } from "aws-cdk-lib/aws-ec2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { GuDistributable } from "../../types";
import type { GuDistributableForEc2 } from "../../types";
import type { GuPrivateS3ConfigurationProps } from "../../utils/ec2";
import { GuDistributionBucketParameter } from "../core";
import type { GuApp } from "../core";

export interface GuUserDataProps {
  distributable: GuDistributableForEc2;
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

  private downloadDistributable(scope: GuApp, props: GuDistributableForEc2) {
    const bucketKey = GuDistributable.getObjectKey(scope, props);

    const bucket = Bucket.fromBucketAttributes(scope, "DistributionBucket", {
      bucketName: GuDistributionBucketParameter.getInstance(scope.parent).valueAsString,
    });

    this.addS3DownloadCommand({
      bucket,
      bucketKey,
      localFile: `/${scope.app}/${props.fileName}`,
    });
  }

  private downloadConfiguration(scope: GuApp, props: GuPrivateS3ConfigurationProps) {
    const bucket = Bucket.fromBucketAttributes(scope, `${scope.app}ConfigurationBucket`, {
      bucketName: props.bucket.valueAsString,
    });

    props.files.forEach((bucketKey) => {
      const fileName = bucketKey.split("/").slice(-1)[0];

      this.addS3DownloadCommand({
        bucket,
        bucketKey,
        localFile: `/etc/${scope.app}/${fileName}`,
      });
    });
  }

  constructor(scope: GuApp, props: GuUserDataProps) {
    this._userData = UserData.forLinux();

    if (props.configuration) {
      this.downloadConfiguration(scope, props.configuration);
    }

    this.downloadDistributable(scope, props.distributable);
    this.addCommands(props.distributable.executionStatement);
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
