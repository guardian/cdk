import { Token } from "aws-cdk-lib";
import type { VpcProps } from "aws-cdk-lib/aws-ec2";
import { GatewayVpcEndpointAwsService, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import type { GuStack } from "../core";

export type GuVpcProps = VpcProps;

/**
 * Construct which creates a Virtual Private Cloud.
 *
 * NOTE: This construct requires an
 * [environment](https://docs.aws.amazon.com/cdk/latest/guide/environments.html)
 * to be set to function correctly. Without this, an environment-agnostic
 * template will be produced, which will only use two AZs even if the region
 * contains more than that. To set this, set the `env` prop when instantiating
 * your stack.
 *
 * NOTE: If using this construct outside eu-west-1, you'll need to commit the
 * `cdk.context.json` file that's created after synthesising locally.
 *
 * Be aware that account IDs are considered sensitive information and should NOT
 * be committed to public repos.
 *
 * The VPC is provisioned with a public and private subnet for each availability
 * zone, with IPs spread evenly across these. Instances in private subnets
 * cannot be accessed directly over the internet. You should locate services in
 * instances in the private subnets, and provide HTTP(S) as required via load
 * balancers living in the public subnets.
 *
 * A CIDR block is a combined IP and network mask that specifies the IP
 * addresses in your VPC. For testing purposes any (AWS supported) CIDR block
 * will do, but for production you should:
 *
 * - use a /21 network mask (providing up to 2048 IPs, which is plenty for most
 *   accounts)
 * - ask Enterprise Tech for an IP address to go with this range (so that
 *   peering with other company VPCs is possible without IP clashes)
 *
 * A managed NAT is created for each private subnet to allow access to the
 * internet.
 *
 * For recommendations on how best to configure your VPC see:
 * https://github.com/guardian/recommendations/blob/main/AWS.md#vpc
 *
 * For more information on VPCs and AWS see:
 * https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html.
 */
export class GuVpc extends Vpc {
  /**
   * Programmatically sets the CDK context with a list of AZs for eu-west-1.
   * This means consuming stacks do NOT have to commit a `cdk.context.json`
   * file when using this construct in eu-west-1.
   *
   * @throws {Error} if the account ID has not been explicitly set on the parent GuStack
   * @private
   */
  private static setAvailabilityZoneContext({ account, node }: GuStack) {
    if (Token.isUnresolved(account)) {
      throw new Error(
        `Account ID not set - the resulting VPC might not be shaped how you'd expect. See https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StackProps.html#env`
      );
    }

    node.setContext(`availability-zones:account=${account}:region=eu-west-1`, [
      "eu-west-1a",
      "eu-west-1b",
      "eu-west-1c",
    ]);
  }

  constructor(scope: GuStack, id: string, props?: GuVpcProps) {
    const defaultVpcProps: VpcProps = {
      gatewayEndpoints: {
        s3: {
          service: GatewayVpcEndpointAwsService.S3,
        },
        dynamodb: {
          service: GatewayVpcEndpointAwsService.DYNAMODB,
        },
      },

      subnetConfiguration: [
        {
          name: "ingress",
          subnetType: SubnetType.PUBLIC,
        },
        {
          name: "application",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    };

    // Set the context BEFORE the `super` call to avoid `Error: Cannot set context after children have been added`
    GuVpc.setAvailabilityZoneContext(scope);

    super(scope, id, { ...defaultVpcProps, ...props });
  }
}
