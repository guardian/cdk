import type { VpcProps } from "@aws-cdk/aws-ec2";
import { GatewayVpcEndpointAwsService, SubnetType, Vpc } from "@aws-cdk/aws-ec2";
import { StringListParameter, StringParameter } from "@aws-cdk/aws-ssm";
import { VPC_SSM_PARAMETER_PREFIX } from "../../constants/ssm-parameter-paths";
import { GuStatefulMigratableConstruct } from "../../utils/mixin";
import type { GuStack } from "../core";
import type { GuMigratingResource } from "../core/migrating";

interface GuVpcCustomProps {
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

interface GuVpcProps extends GuVpcCustomProps, VpcProps, GuMigratingResource {}

/**
 * Construct which creates a Virtual Private Cloud.
 *
 * The VPC is provisioned with a public and private subnet for each availability
 * zone, with IPs spread evenly across these.
 *
 * A CIDR block is a combined IP and network mask that specifies the IP
 * addresses in your VPC. For testing purposes any (AWS supported) CIDR block
 * will do, but for production you should:
 *
 * - use a /21 network mask (providing 2048 IPs, which is plenty for most
 *   accounts)
 * - ask Enterprise Tech for an IP address to go with this range (so that
 *   peering with other company VPCs is possible without IP
 *   clashes)
 *
 * A managed NAT is created for each private subnet to allow access to the
 * internet.
 */
export class GuVpc extends GuStatefulMigratableConstruct(Vpc) {
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
