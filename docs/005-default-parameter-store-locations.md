# Default Parameter Store Locations

A number of constructs from the library define parameters to get configuration from Parameter Store. Each of these parameters configures a default path. The below table lists those paths, the parameter that sets them, the expected value type and which construct the parameter is defined within.

| Path                                  | Parameter              | Type                         | Construct                  |
| ------------------------------------- | ---------------------- | ---------------------------- | -------------------------- |
| /account/vpc/primary/id               | VpcId                  | AWS::EC2::VPC::Id            | GuVpc.fromIdParameter      |
| /account/vpc/primary/subnets/public   | PublicSubnets          | List\<AWS::EC2::Subnet::Id\> | GuVpc.subnetsFromParameter |
| /account/vpc/primary/subnets/private  | PrivateSubnets         | List\<AWS::EC2::Subnet::Id\> | GuVpc.subnetsFromParameter |
| /account/services/artifact.bucket     | DistributionBucketName | String                       | GuGetDistributablePolicy   |
| /account/services/logging.stream.name | LoggingStreamName      | String                       | GuLogShippingPolicy        |
