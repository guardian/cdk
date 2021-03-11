import type { GuPrivateConfigBucketParameter } from "../../constructs/core";

/**
 * Information about an ec2 app's private configuration.
 * `files` are paths from the root of the bucket.
 *   TODO change this once we have defined best practice for configuration.
 */
export interface GuPrivateS3ConfigurationProps {
  bucket: GuPrivateConfigBucketParameter;
  files: string[];
}
