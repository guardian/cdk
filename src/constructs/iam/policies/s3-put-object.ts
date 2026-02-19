import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../../core";
import { GuAllowPolicy } from "./base-policy";
import type { GuNoStatementsPolicyProps } from "./base-policy";

export interface GuPutS3ObjectPolicyProps extends GuNoStatementsPolicyProps {
  bucketName: string;
  paths?: string[];
}

export class GuPutS3ObjectsPolicy extends GuAllowPolicy {
  static buildStatements(bucketName: string, paths?: string[]): PolicyStatement[] {
    const resolvedPaths = paths ?? ["*"];
    return [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:PutObject"],
        resources: resolvedPaths.map((path) => `arn:aws:s3:::${bucketName}/${path}`),
      }),
    ];
  }

  constructor(scope: GuStack, id: string, props: GuPutS3ObjectPolicyProps) {
    const { paths = ["*"] } = props; // set defaults
    const s3Resources: string[] = paths.map((path) => `arn:aws:s3:::${props.bucketName}/${path}`);
    super(scope, id, { ...props, actions: ["s3:PutObject"], resources: s3Resources });
  }
}
