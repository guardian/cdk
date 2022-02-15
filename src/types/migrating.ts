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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- user defined type guard
export function isGuMigratingStack(construct: any): construct is GuMigratingStack {
  return "migratedFromCloudFormation" in construct;
}

export interface GuStatefulConstruct {
  /**
   * A flag to signal to `GuMigratingResource` that a construct is stateful and care should be taken when migrating to GuCDK.
   * If one accidentally replaces a stateful resource, downstream services such as DNS may be impacted.
   */
  isStatefulConstruct: true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- user defined type guard
export function isGuStatefulConstruct(construct: any): construct is GuStatefulConstruct {
  return "isStatefulConstruct" in construct;
}
