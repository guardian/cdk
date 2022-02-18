import { Peer } from "@aws-cdk/aws-ec2";
import { AccessScope } from "../constants/access";
import { AppAccess } from "./access";

describe("AppAccess.validate", () => {
  it("should correctly validate RestrictedAccess", () => {
    expect(() => {
      AppAccess.validate({
        scope: AccessScope.RESTRICTED,
        cidrRanges: [Peer.ipv4("1.2.3.4/21"), Peer.ipv4("10.0.0.0/0")],
      });
    }).not.toThrowError();
  });

  it("should not allow RestrictedAccess to grant global access", () => {
    expect(() => {
      AppAccess.validate({
        scope: AccessScope.RESTRICTED,
        cidrRanges: [Peer.ipv4("1.2.3.4/21"), Peer.anyIpv4()],
      });
    }).toThrowError(
      `Restricted apps cannot be globally accessible. Adjust CIDR ranges (1.2.3.4/21, 0.0.0.0/0) or use Public.`
    );
  });

  it("should correctly validate InternalAccess", () => {
    expect(() => {
      AppAccess.validate({
        scope: AccessScope.INTERNAL,
        cidrRanges: [Peer.ipv4("10.0.0.0/0")],
      });
    }).not.toThrowError();
  });

  it("should not allow InternalAccess to grant external access", () => {
    expect(() => {
      AppAccess.validate({
        scope: AccessScope.INTERNAL,
        cidrRanges: [Peer.ipv4("10.0.0.0/0"), Peer.ipv4("1.2.3.4/21")],
      });
    }).toThrowError(
      `Internal apps should only be accessible on 10. ranges. Adjust CIDR ranges (10.0.0.0/0, 1.2.3.4/21) or use Restricted.`
    );
  });
});
