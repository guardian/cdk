import { Tags } from "aws-cdk-lib";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import type { GuStack } from "../core";
import { GuRole } from "./roles";

export interface GuJanusProvisionedRoleProps {
  /**
   * Allows multiple roles to be defined in a stack.
   */
  id: string;

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
 * new GuJanusProvisionedRole(stack, {
 *   id: "SomeAppDevProvisionedRole",
 *   janusPermission: "some-app-dev",
 *   janusName: "Some App Developer",
 *   janusDescription: "Description of role that will be shown in Janus.",
 * })
 * ```
 */
export class GuJanusProvisionedRole extends GuRole {
  constructor(scope: GuStack, props: GuJanusProvisionedRoleProps) {
    super(scope, props.id, {
      // Will be assumed by a Janus user via STS service
      assumedBy: new ServicePrincipal("sts.amazonaws.com"),
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
