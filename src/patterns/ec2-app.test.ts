import "@aws-cdk/assert/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { simpleGuStackForTesting } from "../utils/test";
import { GuApplicationPorts, GuEc2App } from "./ec2-app";

describe("the GuEC2App pattern", function () {
  it("should compile", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "test-gu-ec2-app",
      publicFacing: false,
      userData: "#!/bin/dev foobarbaz",
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should contain a load balancer with a listener and target group", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "test-gu-ec2-app",
      publicFacing: false,
      userData: "#!/bin/dev foobarbaz",
    });

    const json = SynthUtils.toCloudFormation(stack) as JSON;

    expect(json).toHaveResource("AWS::ElasticLoadBalancingV2::LoadBalancer", {
      Subnets: { Ref: "PrivateSubnets" },
    });
    expect(json).toHaveResource("AWS::ElasticLoadBalancingV2::Listener", {
      Certificates: [{ CertificateArn: { Ref: "CertArn" } }],
    });
    expect(json).toHaveResource("AWS::ElasticLoadBalancingV2::TargetGroup");
  });
});
