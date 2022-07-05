import { UserData } from "aws-cdk-lib/aws-ec2";
import type { S3DownloadOptions } from "aws-cdk-lib/aws-ec2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { GuDistributable } from "../../types";
import type { GuDistributableForEc2 } from "../../types";
import type { GuPrivateS3ConfigurationProps } from "../../utils/ec2";
import { GuDistributionBucketParameter } from "../core";
import type { AppIdentity, GuStack } from "../core";

export type GuUserDataPropsWithApp = GuUserDataProps & AppIdentity;
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

  private downloadDistributable(scope: GuStack, app: AppIdentity, props: GuDistributableForEc2) {
    const bucketKey = GuDistributable.getObjectKey(scope, app, props);

    const bucket = Bucket.fromBucketAttributes(scope, "DistributionBucket", {
      bucketName: GuDistributionBucketParameter.getInstance(scope).valueAsString,
    });

    this.addS3DownloadCommand({
      bucket,
      bucketKey,
      localFile: `/${app.app}/${props.fileName}`,
    });
  }

  private downloadConfiguration(scope: GuStack, app: string, props: GuPrivateS3ConfigurationProps) {
    const bucket = Bucket.fromBucketAttributes(scope, `${app}ConfigurationBucket`, {
      bucketName: props.bucket.valueAsString,
    });

    props.files.forEach((bucketKey) => {
      const fileName = bucketKey.split("/").slice(-1)[0];

      // `fileName` is typed as `string | undefined`. Throw if `fileName` is falsy.
      if (!fileName) {
        throw new Error("Failed to create configuration section in UserData");
      }

      this.addS3DownloadCommand({
        bucket,
        bucketKey,
        localFile: `/etc/${app}/${fileName}`,
      });
    });
  }

  constructor(scope: GuStack, props: GuUserDataPropsWithApp) {
    this._userData = UserData.forLinux();

    if (props.configuration) {
      this.downloadConfiguration(scope, props.app, props.configuration);
    }

    this.downloadDistributable(scope, props, props.distributable);
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
