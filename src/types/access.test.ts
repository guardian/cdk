import { doesNotThrow, throws } from "node:assert";
import { suite, test } from "node:test";
import { Peer } from "aws-cdk-lib/aws-ec2";
import { AccessScope } from "../constants";
import { AppAccess } from "./access";

suite("AppAccess.validate", () => {
  test("should correctly validate RestrictedAccess", () => {
    doesNotThrow(() => {
      AppAccess.validate({
        scope: AccessScope.RESTRICTED,
        cidrRanges: [Peer.ipv4("1.2.3.4/21"), Peer.ipv4("10.0.0.0/0")],
      });
    });
  });

  test("should not allow RestrictedAccess to grant global access", () => {
    throws(() => {
      AppAccess.validate({
        scope: AccessScope.RESTRICTED,
        cidrRanges: [Peer.ipv4("1.2.3.4/21"), Peer.anyIpv4()],
      });
    }, new Error(`Restricted apps cannot be globally accessible. Adjust CIDR ranges (1.2.3.4/21, 0.0.0.0/0) or use Public.`));
  });

  test("should correctly validate InternalAccess", () => {
    doesNotThrow(() => {
      AppAccess.validate({
        scope: AccessScope.INTERNAL,
        cidrRanges: [Peer.ipv4("10.0.0.0/0")],
      });
    });
  });

  test("should not allow InternalAccess to grant external access", () => {
    throws(() => {
      AppAccess.validate({
        scope: AccessScope.INTERNAL,
        cidrRanges: [Peer.ipv4("10.0.0.0/0"), Peer.ipv4("1.2.3.4/21")],
      });
    }, new Error(`Internal apps should only be accessible on 10. ranges. Adjust CIDR ranges (10.0.0.0/0, 1.2.3.4/21) or use Restricted.`));
  });
});
