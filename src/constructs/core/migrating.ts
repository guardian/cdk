import type { CfnElement, IConstruct } from "@aws-cdk/core";
import { Logger } from "../../utils/logger";
import type { GuStack } from "./stack";

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
   * @requires `migratedFromCloudFormation` to be true in [[ GuStack ]]
   * @see GuStackProps
   */
  existingLogicalId?: string;
}

export interface GuStatefulConstruct extends IConstruct {
  isStatefulConstruct: true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- user defined type guard
function isGuStatefulConstruct(construct: any): construct is GuStatefulConstruct {
  return "isStatefulConstruct" in construct;
}

export const GuMigratingResource = {
  setLogicalId<T extends GuStatefulConstruct | IConstruct>(
    construct: T,
    { migratedFromCloudFormation }: GuStack,
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
        Logger.warn(
          `GuStack has 'migratedFromCloudFormation' set to true. ${id} is a stateful construct and 'existingLogicalId' has not been set. ${id}'s logicalId will be auto-generated and consequently AWS will create a new resource rather than inheriting an existing one. This is not advised as downstream services, such as DNS, will likely need updating.`
        );
      }
    } else {
      if (existingLogicalId) {
        Logger.warn(
          `GuStack has 'migratedFromCloudFormation' set to false. ${id} has an 'existingLogicalId' set to ${existingLogicalId}. This will have no effect - the logicalId will be auto-generated. Set 'migratedFromCloudFormation' to true for 'existingLogicalId' to be observed.`
        );
      }

      if (isStateful) {
        Logger.info(
          `GuStack has 'migratedFromCloudFormation' set to false. ${id} is a stateful construct, it's logicalId will be auto-generated and AWS will create a new resource.`
        );
      }
    }
  },
};
