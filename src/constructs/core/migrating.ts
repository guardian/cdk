import { Annotations } from "@aws-cdk/core";
import type { CfnElement, IConstruct } from "@aws-cdk/core";
import type { GuMigratingStack } from "../../types/migrating";
import { isGuStatefulConstruct } from "../../types/migrating";

export interface GuMigratingResource {
  /**
   * A string to use to override the logicalId AWS CDK auto-generates for a resource.
   * This is useful when migrating a pre-existing stack into guardian/cdk,
   * as it ensures resources are kept rather than recreated.
   * For example, imagine a YAML stack that creates a load balancer with logicalId `DotcomLoadbalancer`.
   * We would want to set `existingLogicalId` for the GuLoadBalancer in guardian/cdk to ensure it is preserved when moving to guardian/cdk.
   * Otherwise it will be created as something like `DotcomLoadbalancerABCDEF`,
   * is a new resource, and require any DNS entries to be updated accordingly.
   *
   * @see GuMigratingStack
   * @see GuStack
   */
  existingLogicalId?: {
    /**
     * The logical ID to use in the synthesised template for this resource.
     */
    logicalId: string;

    /**
     * A short description to help developers understand why this resource's logical ID is being set.
     */
    reason: string;
  };
}

export const GuMigratingResource = {
  setLogicalId<T extends IConstruct>(
    construct: T,
    { migratedFromCloudFormation }: GuMigratingStack,
    { existingLogicalId }: GuMigratingResource
  ): void {
    const overrideLogicalId = (logicalId: string) => {
      const defaultChild = construct.node.defaultChild as CfnElement;
      defaultChild.overrideLogicalId(logicalId);
    };

    const id = construct.node.id;
    const isStateful = isGuStatefulConstruct(construct);

    if (migratedFromCloudFormation) {
      if (existingLogicalId) {
        return overrideLogicalId(existingLogicalId.logicalId);
      }

      if (isStateful) {
        Annotations.of(construct).addWarning(
          `GuStack has 'migratedFromCloudFormation' set to true. ${id} is a stateful construct and 'existingLogicalId' has not been set. ${id}'s logicalId will be auto-generated and consequently AWS will create a new resource rather than inheriting an existing one. This is not advised as downstream services, such as DNS, will likely need updating.`
        );
      }
    } else {
      if (existingLogicalId) {
        Annotations.of(construct).addWarning(
          `GuStack has 'migratedFromCloudFormation' set to false. ${id} has an 'existingLogicalId' set to ${existingLogicalId.logicalId}. This will have no effect - the logicalId will be auto-generated. Set 'migratedFromCloudFormation' to true for 'existingLogicalId' to be observed.`
        );
      }

      if (isStateful) {
        Annotations.of(construct).addInfo(
          `GuStack has 'migratedFromCloudFormation' set to false. ${id} is a stateful construct, it's logicalId will be auto-generated and AWS will create a new resource.`
        );
      }
    }
  },
};
