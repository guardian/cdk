import {Template} from "aws-cdk-lib/assertions";
import {InstanceClass, InstanceSize, InstanceType, UserData} from "aws-cdk-lib/aws-ec2";
import {AccessScope} from "../../constants";
import {simpleGuStackForTesting} from "../../utils/test";
import {GuEcsApp} from "./ecs-app";

describe("the GuEcsApp pattern", function () {
  it("should produce a functional ECS app with minimal arguments", function () {
    const stack = simpleGuStackForTesting({env: {region: "eu-west-1"}});
    new GuEcsApp(stack, {
      applicationPort: 3000,
      app: "test-gu-ec2-app",
      access: {scope: AccessScope.PUBLIC},
      buildIdentifier: "test-build-identifier",
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      monitoringConfiguration: {noMonitoring: true},
      instanceMetricGranularity: "5Minute",
      userData: UserData.forLinux(),
      certificateProps: {
        domainName: "domain-name-for-your-application.example",
      },
      scaling: {
        minimumInstances: 1,
      },
    });
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
