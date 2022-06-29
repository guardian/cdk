import type { VpcProps } from "aws-cdk-lib/aws-ec2";
import { GatewayVpcEndpointAwsService, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { StringListParameter, StringParameter } from "aws-cdk-lib/aws-ssm";
import { VPC_SSM_PARAMETER_PREFIX } from "../../constants";
import type { GuStack } from "../core";

export interface GuVpcCustomProps {
  /**
   * Whether to add SSM Parameters containing VPC metadata, which are expected
   * to exist by many other Guardian CDK patterns.
   *
   * Defaults to 'true'.
   */
  ssmParameters?: boolean;

  /**
   * An identifier for the VPC to namespace SSM parameters. Customise when you
   * have multiple teams/VPCs in the same account.
   *
   * This will be combined with the /account/vpc prefix for the full parameter
   * name. e.g. '/account/vpc/primary'.
   *
   * Defaults to 'primary'.
   */
  ssmParametersNamespace?: string;
}

export interface GuVpcProps extends GuVpcCustomProps, VpcProps {}

/**
 * Construct which creates a Virtual Private Cloud.
 *
 * NOTE: this construct requires an
 * [environment](https://docs.aws.amazon.com/cdk/latest/guide/environments.html)
 * to be set to function correctly. Without this, an environment-agnostic
 * template will be produced, which will only use two AZs even if the region
 * contains more than that. To set this, set the `env` prop when instantiating
 * your stack, synthesise locally, and then commit the resulting
 * `cdk.context.json` file, which will contain AZ context for your region. You
 * can see an example of setting env
 * [here](https://github.com/guardian/security-platform/commit/f534c915f1b0b21335c1123142768486a3a803e9#diff-670bd823c8f00bb3feb2eaf95e1ed4606f7c6b0a23776f744aedad04a89b4032R13).
 * And the resulting context to commit
 * [here](https://github.com/guardian/security-platform/commit/f534c915f1b0b21335c1123142768486a3a803e9#diff-5622c70a58b7fe378a6fcda75140ab471187b621674d563be7eefcff05c2660a).
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
          subnetType: SubnetType.PRIVATE_WITH_NAT,
        },
      ],
    };

    const defaultCustomProps: Required<GuVpcCustomProps> = {
      ssmParameters: true,
      ssmParametersNamespace: "primary",
    };

    super(scope, id, { ...defaultVpcProps, ...props });

    if (props?.ssmParameters ?? defaultCustomProps.ssmParameters) {
      const namespace = props?.ssmParametersNamespace ?? defaultCustomProps.ssmParametersNamespace;
      const prefix = `${VPC_SSM_PARAMETER_PREFIX}/${namespace}`;

      new StringParameter(scope, "vpcID", {
        parameterName: `${prefix}/id`,
        stringValue: this.vpcId,
      });

      new StringListParameter(scope, "publicSubnets", {
        parameterName: `${prefix}/subnets/public`,
        stringListValue: this.publicSubnets.map((subnet) => subnet.subnetId),
      });

      new StringListParameter(scope, "privateSubnets", {
        parameterName: `${prefix}/subnets/private`,
        stringListValue: this.privateSubnets.map((subnet) => subnet.subnetId),
      });
    }
  }
}
