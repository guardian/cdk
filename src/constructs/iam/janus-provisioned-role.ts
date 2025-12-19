import { Tags } from "aws-cdk-lib";
import { ArnPrincipal } from "aws-cdk-lib/aws-iam";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { GuStack } from "../core";
import { GuRole } from "./roles";

export interface GuJanusProvisionedRoleProps {
  /**
   * Tells Janus which ProvisionedRole this IAM role is part of.
   */
  janusPermission: string;

  /**
   * A friendly name for this IAM role to be shown in Janus.
   * It should help Janus users to choose the right role.
   */
  janusName?: string;

  /**
   * A description of this IAM role to be shown in Janus.
   * It should help Janus users to choose the right role.
   */
  janusDescription?: string;
}

/**
 * Construct that creates an IAM role with the additional tags that Janus uses to find the role
 * and its metadata.
 *
 * ```typescript
 * new GuJanusProvisionedRole(stack, "SomeAppDevProvisionedRole", {
 *   janusPermission: "some-app-dev",
 *   janusName: "Some App Developer",
 *   janusDescription: "Description of role that will be shown in Janus.",
 * })
 * ```
 */
export class GuJanusProvisionedRole extends GuRole {
  constructor(scope: GuStack, id: string, props: GuJanusProvisionedRoleProps) {
    // Existing SSM param in stack account that holds Janus user ARN
    const janusArnParamValue = StringParameter.valueForStringParameter(scope, "/security/janus/user-arn");
    super(scope, id, {
      // Will be assumed by Janus user
      assumedBy: new ArnPrincipal(janusArnParamValue),
    });
    const tags = Tags.of(this);
    tags.add("gu:janus:discoverable", "true");
    tags.add("gu:janus:permission", props.janusPermission);
    if (props.janusName) {
      tags.add("gu:janus:name", props.janusName);
    }
    if (props.janusDescription) {
      tags.add("gu:janus:description", props.janusDescription);
    }
  }
}
