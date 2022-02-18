/**
 * An enum representing different types of application access.
 */
export enum AccessScope {
  /**
   * For when you want your application to be accessible to the world (0.0.0.0/0).
   */
  PUBLIC = "Public",

  /**
   * For when you want to restrict your application's access to a list of CIDR ranges.
   */
  RESTRICTED = "Restricted",

  /**
   * For when you want to restrict your application's access to the VPC.
   */
  INTERNAL = "Internal",
}
