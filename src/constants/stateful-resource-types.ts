/**
 * A list of resource types that should be considered stateful
 * and care should be taken when updating them to ensure they
 * are not accidentally replaced as this could lead to downtime.
 *
 * For example, if a load balancer is accidentally replaced,
 * any CNAME DNS entry for it would now be invalid and downtime
 * will be incurred for the TTL of the DNS entry.
 *
 * Currently, this list is used to generate warnings at synth time.
 * Ideally we'd add a stack policy to stop the resource being deleted,
 * however this isn't currently supported in CDK.
 *
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html
 * @see https://github.com/aws/aws-cdk-rfcs/issues/72
 */
export const StatefulResourceTypes: string[] = [
  "AWS::CertificateManager::Certificate",
  "AWS::DynamoDB::Table",
  "AWS::ElasticLoadBalancing::LoadBalancer",
  "AWS::ElasticLoadBalancingV2::LoadBalancer",
  "AWS::S3::Bucket",
];
