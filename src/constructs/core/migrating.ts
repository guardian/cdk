import { Annotations } from "@aws-cdk/core";
import { isGuStatefulConstruct } from "../../utils/mixin";
import type { CfnElement, IConstruct } from "@aws-cdk/core";

export interface GuMigratingStack {
  /**
   * A flag to symbolise if a stack is being migrated from a previous format (eg YAML) into guardian/cdk.
   * A value of `true` means resources in the stack can have custom logicalIds set using the property `existingLogicalId` (where available).
   * A value of `false` or `undefined` means the stack is brand new. Any resource that gets created will have an auto-generated logicalId.
   * Ideally, for use only by [[ `GuStack` ]].
   * @see GuMigratingResource
   * @see GuStack
   */
  migratedFromCloudFormation: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types -- user defined type guard
export function isGuMigratingStack(construct: any): construct is GuMigratingStack {
  return "migratedFromCloudFormation" in construct;
}

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
  existingLogicalId?: string;
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
        return overrideLogicalId(existingLogicalId);
      }

      if (isStateful) {
        Annotations.of(construct).addWarning(
          `GuStack has 'migratedFromCloudFormation' set to true. ${id} is a stateful construct and 'existingLogicalId' has not been set. ${id}'s logicalId will be auto-generated and consequently AWS will create a new resource rather than inheriting an existing one. This is not advised as downstream services, such as DNS, will likely need updating.`
        );
      }
    } else {
      if (existingLogicalId) {
        Annotations.of(construct).addWarning(
          `GuStack has 'migratedFromCloudFormation' set to false. ${id} has an 'existingLogicalId' set to ${existingLogicalId}. This will have no effect - the logicalId will be auto-generated. Set 'migratedFromCloudFormation' to true for 'existingLogicalId' to be observed.`
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
