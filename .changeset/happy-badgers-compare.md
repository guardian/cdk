---
"@guardian/cdk": minor
---

feat(experimental-ec2-pattern): Pattern to deploy ASG updates w/CFN

Included in this update is a new experimental pattern `GuEc2AppExperimental`, which can be used in place of a `GuEc2App`:

```ts
import { GuEc2AppExperimental } from "@guardian/cdk/lib/experimental/patterns/ec2-app";
```

This pattern will add an [`AutoScalingRollingUpdate` policy](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate)
to the autoscaling group.
This allows application updates to be performed like a standard CloudFormation update,
and using the custom logic provided by Riff-Raff's `autoscaling` deployment type is unnecessary.

This experimental pattern has few requirements.

## Add the build number to the application artifact
This change requires versioned artifacts.

The easiest way to achieve this is by adding the build number to the filename of the artifact:

```ts
import { UserData } from "aws-cdk-lib/aws-ec2";
// Use a GitHub Actions provided environment variable
const buildNumber = process.env.GITHUB_RUN_NUMBER ?? "DEV";

const userData = UserData.forLinux();
userData.addCommands(`aws s3 cp s3://dist-bucket/path/to/artifact-${buildNumber}.deb /tmp/artifact.deb`);
userData.addCommands(`dpkg -i /tmp/artifact.dep`);
```

## `riff-raff.yaml`
The `riff-raff.yaml` file should remove the `deploy` action of the `autoscaling` deployment type.
Though including it shouldn't break anything, it would result in a longer deployment time as instance will be rotated by both CloudFormation and Riff-Raff's custom logic.

The `uploadArtifacts` step of the `autoscaling` deployment type should still be included, with the `cloud-formation` deployment type depending on it.
This step uploads the versioned artifact to S3.

> [!TIP]
> An [auto-generated `riff-raff.yaml` file](https://github.com/guardian/cdk/blob/main/src/riff-raff-yaml-file/README.md) meets this requirement.
