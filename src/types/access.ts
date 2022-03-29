import type { IPeer } from "aws-cdk-lib/aws-ec2";
import { Peer } from "aws-cdk-lib/aws-ec2";
import { AccessScope } from "../constants/access";

export interface Access {
  scope: AccessScope;
}

/**
 * For when you want your application to be accessible to the world (0.0.0.0/0).
 * Your application load balancer will have a public IP address that can be reached by anyone,
 * so only use if you are aware and happy with the consequences!
 *
 * Example usage:
 * ```typescript
 * { scope: AccessScope.PUBLIC }
 * ```
 */
export interface PublicAccess extends Access {
  scope: AccessScope.PUBLIC;
}

/**
 * For when you want to restrict your application's access to a list of CIDR ranges. For example,
 * if you want limit access to users connecting from Guardian offices only.
 *
 * Example usage:
 * ```typescript
 * {
 *   scope: AccessScope.RESTRICTED,
 *   cidrRanges: [Peer.ipv4("192.168.1.1/32"), Peer.ipv4("8.8.8.8/32")]
 * }
 * ```
 */
export interface RestrictedAccess extends Access {
  scope: AccessScope.RESTRICTED;
  cidrRanges: IPeer[];
}

/**
 * For when you want to restrict your application's access to services running inside your VPC.
 *
 * Note that if your account uses Direct Connect or VPC Peering, then incoming traffic from these sources
 * can also be allowed.
 *
 * Example usage:
 * ```typescript
 * {
 *   scope: AccessScope.INTERNAL,
 *   cidrRanges: [Peer.ipv4("10.0.0.0/8")]
 * }
 * ```
 */
export interface InternalAccess extends Access {
  scope: AccessScope.INTERNAL;
  cidrRanges: IPeer[];
}

export type AppAccess = PublicAccess | RestrictedAccess | InternalAccess;

export const AppAccess = {
  /**
   * Validate the CIDR rules for AppAccess.
   *
   * Public - always valid. No CIDR rules are needed here, and the type-system enforces this
   * Restricted - Must not include global CIDR ranges as doing so makes other listed CIDR ranges redundant
   * Internal - All CIDR ranges must start `10.`
   *
   * @throws `Error` when CIDR rules are invalid
   */
  validate: (access: AppAccess) => {
    switch (access.scope) {
      case AccessScope.RESTRICTED: {
        const ranges = access.cidrRanges.map((_) => _.uniqueId);
        const rangesString = ranges.join(", ");

        if (ranges.includes(Peer.anyIpv4().uniqueId) || ranges.includes(Peer.anyIpv6().uniqueId)) {
          throw new Error(
            `${AccessScope.RESTRICTED} apps cannot be globally accessible. Adjust CIDR ranges (${rangesString}) or use ${AccessScope.PUBLIC}.`
          );
        }
        break;
      }

      case AccessScope.INTERNAL: {
        const ranges = access.cidrRanges.map((_) => _.uniqueId);
        const rangesString = ranges.join(", ");

        if (ranges.some((range) => !range.startsWith("10."))) {
          throw new Error(
            `${AccessScope.INTERNAL} apps should only be accessible on 10. ranges. Adjust CIDR ranges (${rangesString}) or use ${AccessScope.RESTRICTED}.`
          );
        }
        break;
      }
      default:
        break;
    }
  },
};
