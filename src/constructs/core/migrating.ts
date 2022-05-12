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
