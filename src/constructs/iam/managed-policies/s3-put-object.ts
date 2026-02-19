import type { GuStack } from "../../core";
import { GuPutS3ObjectsPolicy } from "../policies";
import { GuManagedPolicy } from "./base-managed-policy";
import type { GuManagedPolicyProps } from "./base-managed-policy";

export interface GuPutS3ObjectManagedPolicyProps extends Omit<GuManagedPolicyProps, "statements"> {
  bucketName: string;
  paths?: string[];
}

export class GuPutS3ObjectsManagedPolicy extends GuManagedPolicy {
  constructor(scope: GuStack, id: string, props: GuPutS3ObjectManagedPolicyProps) {
    super(scope, id, {
      ...props,
      statements: GuPutS3ObjectsPolicy.buildStatements(props.bucketName, props.paths),
    });
  }
}
