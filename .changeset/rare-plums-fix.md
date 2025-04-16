---
"@guardian/cdk": minor
---

Removal of the `withoutImdsv2` property from `GuEc2App` and `GuAutoScalingGroup`.
When this property was set to `true`, launched instances would not meet the [FSBP EC2.8 control](https://docs.aws.amazon.com/securityhub/latest/userguide/ec2-controls.html#ec2-8).

Removing this property as a signal that GuCDK will follow FSBP controls by default.

If for whatever reason you need to disable IMDSv2, you can do so via an [escape hatch](https://docs.aws.amazon.com/cdk/v2/guide/cfn_layer.html):

```typescript
import { CfnLaunchTemplate } from "aws-cdk-lib/aws-ec2";

declare const asg: GuAutoScalingGroup;

const launchTemplate = asg.instanceLaunchTemplate.node.defaultChild as CfnLaunchTemplate;

// Set the value to "optional", allowing IMDSv1 and IMDSv2.
// See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-launchtemplate-metadataoptions.html#cfn-ec2-launchtemplate-metadataoptions-httptokens.
launchTemplate.addPropertyOverride("LaunchTemplateData.MetadataOptions.HttpTokens", "optional");

// Or remove the property entirely.
launchTemplate.addPropertyDeletionOverride("LaunchTemplateData.MetadataOptions.HttpTokens");
```
