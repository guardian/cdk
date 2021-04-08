import type { S3DownloadOptions } from "@aws-cdk/aws-ec2";
import { UserData } from "@aws-cdk/aws-ec2";
import { Bucket } from "@aws-cdk/aws-s3";
import type { GuPrivateS3ConfigurationProps } from "../../utils/ec2";
import type { WithDefaultByGuStackAndAppIdentity } from "../../utils/with-defaults";
import { GuDistributionBucketParameter } from "../core";
import type { GuStack } from "../core";
import type { AppIdentity } from "../core/identity";

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

export const GuUserDataS3DistributableProps: WithDefaultByGuStackAndAppIdentity<GuUserDataS3DistributableProps> = {
  DEFAULT(scope: GuStack, props: AppIdentity): GuUserDataS3DistributableProps {
    return {
      bucket: GuDistributionBucketParameter.getInstance(scope),
      fileName: `${props.app}.deb`,
      executionStatement: `dpkg -i /${props.app}/${props.app}.deb`,
    };
  },
};

export interface GuUserDataProps extends AppIdentity {
  distributable: GuUserDataS3DistributableProps;
  configuration?: GuPrivateS3ConfigurationProps;
}

export const GuUserDataProps: WithDefaultByGuStackAndAppIdentity<GuUserDataProps> = {
  DEFAULT(scope: GuStack, props: AppIdentity): GuUserDataProps {
    return {
      ...props,
      distributable: GuUserDataS3DistributableProps.DEFAULT(scope, props),
    };
  },
};

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

  private downloadDistributable(scope: GuStack, app: string, props: GuUserDataS3DistributableProps) {
    const bucketKey = [scope.stack, scope.stage, app, props.fileName].join("/");

    const bucket = Bucket.fromBucketAttributes(scope, "DistributionBucket", {
      bucketName: props.bucket.valueAsString,
    });

    this.addS3DownloadCommand({
      bucket,
      bucketKey,
      localFile: `/${app}/${props.fileName}`,
    });
  }

  private downloadConfiguration(scope: GuStack, app: string, props: GuPrivateS3ConfigurationProps) {
    const bucket = Bucket.fromBucketAttributes(scope, `${app}ConfigurationBucket`, {
      bucketName: props.bucket.valueAsString,
    });

    props.files.forEach((bucketKey) => {
      const fileName = bucketKey.split("/").slice(-1)[0];

      this.addS3DownloadCommand({
        bucket,
        bucketKey,
        localFile: `/etc/${app}/${fileName}`,
      });
    });
  }

  constructor(scope: GuStack, props: GuUserDataProps) {
    this._userData = UserData.forLinux();

    if (props.configuration) {
      this.downloadConfiguration(scope, props.app, props.configuration);
    }

    this.downloadDistributable(scope, props.app, props.distributable);
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
