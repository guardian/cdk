import { Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { InstanceClass, InstanceSize, InstanceType, Vpc } from "aws-cdk-lib/aws-ec2";
import { simpleTestingResources } from "../../utils/test";
import { GuPrivateConfigBucketParameter } from "../core";
import { GuAutoScalingGroup } from "./asg";
import type { GuUserDataProps } from "./user-data";
import { GuUserData } from "./user-data";

describe("GuUserData", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("Distributable should be downloaded from a standard path in S3 (bucket/stack/stage/app/filename)", () => {
    const { stack, app } = simpleTestingResources();

    const props: GuUserDataProps = {
      distributable: {
        fileName: "my-app.deb",
        executionStatement: `dpkg -i /${app.app}/my-app.deb`,
      },
    };

    const { userData } = new GuUserData(app, props);

    new GuAutoScalingGroup(app, "AutoscalingGroup", {
      vpc,
      userData,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      minimumInstances: 1,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::AutoScaling::LaunchConfiguration", {
      UserData: {
        "Fn::Base64": {
          "Fn::Join": [
            "",
            [
              "#!/bin/bash\nmkdir -p $(dirname '/testing/my-app.deb')\naws s3 cp 's3://",
              {
                Ref: "DistributionBucketName",
              },
              "/test-stack/TEST/testing/my-app.deb' '/testing/my-app.deb'\ndpkg -i /testing/my-app.deb",
            ],
          ],
        },
      },
    });
  });

  test("Distributable should download configuration first", () => {
    const { stack, app } = simpleTestingResources();

    const props: GuUserDataProps = {
      distributable: {
        fileName: "my-app.deb",
        executionStatement: `dpkg -i /${app.app}/my-app.deb`,
      },
      configuration: {
        bucket: new GuPrivateConfigBucketParameter(app),
        files: ["secrets.json", "application.conf"],
      },
    };

    const { userData } = new GuUserData(app, props);

    new GuAutoScalingGroup(app, "AutoscalingGroup", {
      vpc,
      userData,
      instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM),
      minimumInstances: 1,
    });

    Template.fromStack(stack).hasResourceProperties("AWS::AutoScaling::LaunchConfiguration", {
      UserData: {
        "Fn::Base64": {
          "Fn::Join": [
            "",
            [
              "#!/bin/bash\nmkdir -p $(dirname '/etc/testing/secrets.json')\naws s3 cp 's3://",
              {
                Ref: "PrivateConfigBucketName",
              },
              "/secrets.json' '/etc/testing/secrets.json'\nmkdir -p $(dirname '/etc/testing/application.conf')\naws s3 cp 's3://",
              {
                Ref: "PrivateConfigBucketName",
              },
              "/application.conf' '/etc/testing/application.conf'\nmkdir -p $(dirname '/testing/my-app.deb')\naws s3 cp 's3://",
              {
                Ref: "DistributionBucketName",
              },
              "/test-stack/TEST/testing/my-app.deb' '/testing/my-app.deb'\ndpkg -i /testing/my-app.deb",
            ],
          ],
        },
      },
    });
  });
});
