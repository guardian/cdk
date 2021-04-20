import "@aws-cdk/assert/jest";
import { Vpc } from "@aws-cdk/aws-ec2";
import { Stack } from "@aws-cdk/core";
import { Stage } from "../../constants";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuPrivateConfigBucketParameter } from "../core";
import { GuAutoScalingGroup } from "./asg";
import type { GuUserDataPropsWithApp } from "./user-data";
import { GuUserData } from "./user-data";

describe("GuUserData", () => {
  const vpc = Vpc.fromVpcAttributes(new Stack(), "VPC", {
    vpcId: "test",
    availabilityZones: [""],
    publicSubnetIds: [""],
  });

  test("Distributable should be downloaded from a standard path in S3 (bucket/stack/stage/app/filename)", () => {
    const stack = simpleGuStackForTesting();
    const app = "testing";

    const props: GuUserDataPropsWithApp = {
      app,
      distributable: {
        fileName: "my-app.deb",
        executionStatement: `dpkg -i /${app}/my-app.deb`,
      },
    };

    const { userData } = new GuUserData(stack, props);

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      vpc,
      userData,
      stageDependentProps: {
        [Stage.CODE]: {
          minimumInstances: 1,
        },
        [Stage.PROD]: {
          minimumInstances: 3,
        },
      },
      app: "testing",
    });

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
      UserData: {
        "Fn::Base64": {
          "Fn::Join": [
            "",
            [
              "#!/bin/bash\nmkdir -p $(dirname '/testing/my-app.deb')\naws s3 cp 's3://",
              {
                Ref: "DistributionBucketName",
              },
              "/test-stack/",
              {
                Ref: "Stage",
              },
              "/testing/my-app.deb' '/testing/my-app.deb'\ndpkg -i /testing/my-app.deb",
            ],
          ],
        },
      },
    });
  });

  test("Distributable should download configuration first", () => {
    const stack = simpleGuStackForTesting();
    const app = "testing";

    const props: GuUserDataPropsWithApp = {
      app,
      distributable: {
        fileName: "my-app.deb",
        executionStatement: `dpkg -i /${app}/my-app.deb`,
      },
      configuration: {
        bucket: new GuPrivateConfigBucketParameter(stack),
        files: ["secrets.json", "application.conf"],
      },
    };

    const { userData } = new GuUserData(stack, props);

    new GuAutoScalingGroup(stack, "AutoscalingGroup", {
      vpc,
      userData,
      stageDependentProps: {
        [Stage.CODE]: {
          minimumInstances: 1,
        },
        [Stage.PROD]: {
          minimumInstances: 3,
        },
      },
      app: "testing",
    });

    expect(stack).toHaveResource("AWS::AutoScaling::LaunchConfiguration", {
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
              "/test-stack/",
              {
                Ref: "Stage",
              },
              "/testing/my-app.deb' '/testing/my-app.deb'\ndpkg -i /testing/my-app.deb",
            ],
          ],
        },
      },
    });
  });
});
