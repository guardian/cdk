# @guardian/cdk

## 62.1.3

### Patch Changes

- 7c25920: Downgrade `@guardian/eslint-config` to v12.0.0 to remove `react` transitive dependency.

## 62.1.2

### Patch Changes

- f1fd01b: The new deployment mechanism (`GuEc2AppExperimental`) now suspends some additional ASG processes:

  `AZRebalance`
  `InstanceRefresh`
  `ReplaceUnhealthy`
  `ScheduledActions`
  `HealthCheck`

  https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-suspend-resume-processes.html#process-types

  This follows a recommendation from AWS and should make deployments (and rollbacks) more reliable:
  https://repost.aws/knowledge-center/auto-scaling-group-rolling-updates

## 62.1.1

### Patch Changes

- d0ad2ec: no-op

  This is a no-op release to test migration to [NPM trusted publishing](https://docs.npmjs.com/trusted-publishers).

## 62.1.0

### Minor Changes

- a335873: Upgrade aws sdk to v3

## 62.0.1

### Patch Changes

- 810a08a: Update aws-cdk to ^2.1030.0, aws-cdk-lib to ^2.219.0, constructs to ^10.4.2

## 62.0.0

### Major Changes

- 12be0e5: Access logging for Application Load Balancers (ALBs) is now enabled by default.

  [Application Load Balancer (ALB) access logs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html) describe, in detail, each request processed by a load balancer, including request paths and status codes.
  They are helpful during incident response and are now enabled by default.

  Previously users of the `GuEc2App`, `GuNodeApp`, `GuPlayApp `, `GuPlayWorkerApp` and `GuEc2AppExperimental` patterns could opt-in to this logging via the `accessLogging` property and configure the S3 prefix.

  This property is now removed and replaced with a new optional boolean property `withAccessLogging` which defaults to `true`.
  - When `true` the ALB will have access logs enabled, configured to write to the account's S3 bucket using a specific prefix for compatibility with the `gucdk_access_logs` database created in Athena via https://github.com/guardian/aws-account-setup.
  - When `false` the [`access_logs.s3.enabled` attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-elasticloadbalancingv2-loadbalancer-loadbalancerattribute.html) is now explicitly set to `false`.

  A `withAccessLogging` property is also added to the `GuApplicationLoadBalancer` construct, with the same behaviour.

  NOTE: This feature requires a region to be set at the `GuStack` level, else the following error will be thrown:

  > ValidationError: Region is required to enable ELBv2 access logging

  Here's an example of how to set the region:

  ```typescript
  class MyStack extends GuStack {
    constructor(scope: App, id: string, props: GuStackProps) {
      super(scope, id, props);
    }
  }

  const stackInstance = new MyStack(app, "MyStack", {
    env: {
      region: "eu-west-1",
    },
  });
  ```

  There are three cost areas to this feature:
  - Writing to S3.

    AWS absorbs these costs.

  - S3 data storage.

    This cost will vary depending on the volume of traffic received; more traffic, more logs. To somewhat mitigate this, the target S3 bucket has already been configured to retain logs for 14 days.

  - Reading from S3 using Athena.

    This cost will vary depending on the volume of logs queried.

## 61.11.1

### Patch Changes

- ce55193: Update aws-cdk to ^2.1029.1, aws-cdk-lib to ^2.214.0, constructs to ^10.4.2

## 61.11.0

### Minor Changes

- 44adc37: feat(experimental-ec2-pattern): Echo RiffRaffDeploymentId in user-data

  This change adds a new CloudFormation parameter, `RiffRaffDeploymentId`, to be set by Riff-Raff during deployment (see guardian/riff-raff#1469).
  This parameter is echoed out in the user-data. This means a redeployment of the same build creates a CloudFormation changeset with a new launch template.
  Consequently, the running EC2 instances are cycled. This means scheduled deployments are possible.

### Patch Changes

- 838492c: Update aws-cdk to ^2.1018.0, aws-cdk-lib to ^2.200.1, constructs to ^10.4.2
- 1e87504: Remove lodash dependencies
- 848d54f: Remove unused `RegexPattern.S3ARN`.

  The regex isn't used (other than within tests of this repository), so we can safely remove it.

## 61.10.1

### Patch Changes

- 0b264a3: Fix resource property of guard duty IAM role for ECS task pattern

## 61.10.0

### Minor Changes

- 9db50ef: Add required permissions to GuEcsTask pattern for guard duty sidecar container

### Patch Changes

- 6c611c8: Broaden CDK peer dependency ranges to allow any aws-cdk/construct version provided more recent than the specified version

## 61.9.0

### Minor Changes

- 339c2e9: Improves the safety of the new deployment mechanism for services which scale horizontally.

  As part of this the `default` and `maxValue` properties of the `MinInstancesInServiceFor<app>` parameter (which is used by Riff-Raff) have been removed.

### Patch Changes

- 888d5e2: Update aws-cdk to 2.1018.0, aws-cdk-lib to 2.200.1, constructs to 10.4.2

## 61.8.2

### Patch Changes

- 1336b63: Update import path of `ContainerInsights`.

## 61.8.1

### Patch Changes

- 2ec1d32: chore(deps): bump `codemaker` from 1.111.0 to 1.112.0

## 61.8.0

### Minor Changes

- 0cc9129: Addition of [slow start mode](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html#slow-start-mode) support for `GuEc2AppExperimental`.

  We recommend enabling this setting if you run a high-traffic service, particularly if it is JVM-based.

## 61.7.0

### Minor Changes

- d1ee03a: feat(GuEc2App): Replace `enabledDetailedInstanceMonitoring` optional property with mandatory `instanceMetricGranularity` property

  Specifying how an ASG service should be monitored is now explicitly required.
  When detailed monitoring is enabled, EC2 metrics are produced at a higher granularity of one minute (default is five minutes).
  This should allow for earlier horizontal scaling and provide more detail during incident triage.

  This change will cost roughly $3 per instance per month.
  We'd recommend using detailed monitoring for production environments.

  See also:
  - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-detailed-monitoring.html
  - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html

## 61.6.0

### Minor Changes

- 50d5978: Addition of new experimental deployment mechanism support for MAPI.

## 61.5.2

### Patch Changes

- 515e00e: Update aws-cdk to 2.1014.0, aws-cdk-lib to 2.195.0, constructs to 10.4.2

## 61.5.1

### Patch Changes

- 34c96ee: fix(GuEcsTaskProps): Change type of `containerInsights` property from `boolean` to `ContainerInsights`.

  This enables support of enhanced ECS monitoring and addresses an AWS CDK deprecation warning.

## 61.5.0

### Minor Changes

Removes `GuWazuhAccess` security group as Wazuh has been deprecated (#2561).

This change will remove a resource of logical ID `WazuhSecurityGroup` from stacks that use a `GuAutoScalingGroup`.
The snapshot diff will include the removal of the following resource:

```json
{
  "Resources": {
    "WazuhSecurityGroup": {
      "Properties": {
        "GroupDescription": "Allow outbound traffic from wazuh agent to manager",
        "SecurityGroupEgress": [
          {
            "CidrIp": "0.0.0.0/0",
            "Description": "Wazuh event logging",
            "FromPort": 1514,
            "IpProtocol": "tcp",
            "ToPort": 1514
          },
          {
            "CidrIp": "0.0.0.0/0",
            "Description": "Wazuh agent registration",
            "FromPort": 1515,
            "IpProtocol": "tcp",
            "ToPort": 1515
          }
        ],
        "Type": "AWS::EC2::SecurityGroup"
      }
    }
  }
}
```

#### How to update to this version

This version of `@guardian/cdk` detaches the `WazuhSecurityGroup` security group from any autoscaling group and deletes it in one step.
When using [Riff-Raff's autoscaling deployment type](https://riffraff.gutools.co.uk/docs/magenta-lib/types#autoscaling), upgrading needs to be performed in two steps, across two independent pull requests.
If we do not, Riff-Raff will fail with an error similar to:

> WazuhSecurityGroup(AWS::EC2::SecurityGroup}: DELETE_FAILED resource sg-1234 has a dependent object (Service: Ec2, Status Code: 400) (SDK Attempt Count: 1)

1. For the first pull request, we'll detach the `WazuhSecurityGroup` security group from the autoscaling group.

   In this step, we detach the `WazuhSecurityGroup` security group from the autoscaling group by upgrading to v61.5.0
   and temporarily recreate `WazuhSecurityGroup` as a resource in the CloudFormation stack:

   ```ts
   declare const myApp: GuEc2App;

   const { vpc } = myApp;

   // A temporary security group with a fixed logical ID, replicating the one removed from GuCDK v61.5.0.
   const tempSecurityGroup = new SecurityGroup(this, "WazuhSecurityGroup", {
     vpc,
     // Must keep the same description, else CloudFormation will try to replace the security group
     // See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-securitygroup.html#cfn-ec2-securitygroup-groupdescription.
     description: "Allow outbound traffic from wazuh agent to manager",
   });
   this.overrideLogicalId(tempSecurityGroup, {
     logicalId: "WazuhSecurityGroup",
     reason: "Part one of updating to GuCDK 61.5.0+ whilst using Riff-Raff's ASG deployment type",
   });
   ```

2. For the second pull request, we'll remove the `WazuhSecurityGroup` security group.

   Now that the security group is unused, we can remove it from the stack by deleting the `tempSecurityGroup` variable created above.

> [!NOTE]
>
> - We've opted against issuing a release for each of these steps as most projects upgrade to the latest version.
> - The new deployment mechanism offered by `GuEc2AppExperimental` does not need this workaround as CloudFormation works out the dependency tree itself.

## 61.4.0

### Minor Changes

- 0426904: Removal of the `withoutImdsv2` property from `GuEc2App` and `GuAutoScalingGroup`.
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

## 61.3.4

### Patch Changes

- 3851bd2: Upgrade to ESLint 9.x and @guardian/eslint-config

  ## Upgrade Guide
  1. Update required dependencies

  ```bash
  # NPM
  npm uninstall @guardian/eslint-config-typescript --save-dev
  npm install eslint@^9.24.0 --save-dev
  npm install @guardian/eslint-config@^11.0.0 --save-dev

  # Or YARN
  yarn remove @guardian/eslint-config-typescript --dev
  yarn add eslint@^9.24.0 --dev
  yarn add @guardian/eslint-config@^11.0.0 --dev
  ```

  2. Switch to using a flat [eslint config](https://eslint.org/docs/latest/use/configure/migration-guide)

  A lot of the config that we used to define is now available by default in the shared` @guardian/eslint-config` library.

  ```bash
  # Remove deprecated .eslintrc config
  rm .eslintrc

  # Replace with newer eslint.config.mjs
  # Most config options we want are enabled by default now in `@guardian/eslint-config` so we can
  # have a fairly minimal eslint config file.
  cat >> eslint.config.mjs << 'END'
  import guardian from '@guardian/eslint-config';

  export default [
  	...guardian.configs.recommended,
  	...guardian.configs.jest
  ];
  END
  ```

  3. Remove [unsupported](https://eslint.org/docs/latest/use/configure/migration-guide#cli-flag-changes) `--ext` flag from `lint` script in `package.json`

  ```bash
  # Remove --ext .ts from `npm run lint` script
  sed -i '' '/--ext .ts/d' ./package.json
  ```

## 61.3.3

### Patch Changes

- e62ed3d: Update aws-cdk to 2.1007.0, aws-cdk-lib to 2.189.0, constructs to 10.4.2

## 61.3.2

### Patch Changes

- 63210c1: Update aws-cdk to 2.1005.0, aws-cdk-lib to 2.185.0, constructs to 10.4.2

  > [!NOTE]
  > The versions of `aws-cdk` and `aws-cdk-lib` are no longer in sync.
  > See https://github.com/aws/aws-cdk/issues/32775.

  The following command can be used to check what peer dependencies are required:

  ```bash
  npm info @guardian/cdk@latest version peerDependencies
  ```

## 61.3.1

### Patch Changes

- 57ed86d: GuKCLPolicy: Fix DynamoDB permissions on new KCL v3 tables

## 61.3.0

### Minor Changes

- fabe6d1: Fix construct id for GuKCLPolicy

## 61.2.0

### Minor Changes

- 5cae0ff: Add GuKCLPolicy, a IAM-policy construct for the Kinesis Client Library

## 61.1.4

### Patch Changes

- c19ee84: Update aws-cdk to 2.178.1, aws-cdk-lib to 2.178.1, constructs to 10.4.2

## 61.1.3

### Patch Changes

- f3e3fe8: Update aws-cdk to 2.177.0, aws-cdk-lib to 2.177.0, constructs to 10.4.2

## 61.1.2

### Patch Changes

- fc1b881: Update aws-cdk to 2.175.1, aws-cdk-lib to 2.175.1, constructs to 10.4.2

## 61.1.1

### Patch Changes

- d1b7fa6: Update aws-cdk to 2.175.0, aws-cdk-lib to 2.175.0, constructs to 10.4.2

## 61.1.0

### Minor Changes

- a11349f: Expose taskDefinition, containerDefinition and task in `GuEcsTask`

## 61.0.2

### Patch Changes

- 3098169: Update aws-cdk to 2.172.0, aws-cdk-lib to 2.172.0, constructs to 10.4.2

## 61.0.1

### Patch Changes

- 60639fd: Apply the standard `Stack`, `Stage`, `App` and `gu:repo` tags to the `AWS::IAM::OIDCProvider` resource
  created via the `GitHubOidcProvider` construct.

## 61.0.0

### Major Changes

- d3259e7: Support multiple usages of `GuGithubActionsRole` in a single AWS account

  This significantly changes the resources constructed by `GuGithubActionsRole`,
  specifically, **the construct will no longer instantiate a `GitHubOidcProvider`**.
  This is because you can only ever have one `GitHubOidcProvider` per provider
  domain (ie `token.actions.githubusercontent.com`) - while we may want multiple
  instances of `GuGithubActionsRole` in an AWS account, we can't have the
  `GuGithubActionsRole` construct trying to make a new `GitHubOidcProvider` with
  each instance.

  Consequently, you will need to instantiate the `GitHubOidcProvider` elsewhere
  as a singleton. At the Guardian, we do this with https://github.com/guardian/aws-account-setup.

### Minor Changes

- bf08a5e: Default to GP3 storage type for RDS

## 60.1.3

### Patch Changes

- b488c2e: Update aws-cdk to 2.170.0, aws-cdk-lib to 2.170.0, constructs to 10.4.2

## 60.1.2

### Patch Changes

- b8f4bbe: Update `codemaker` from 1.104.0 to 1.105.0
- 0d7dd47: Update `git-url-parse` from 15.0.0 to 16.0.0

## 60.1.1

### Patch Changes

- d00fa34: Update `aws-sdk` from 2.1691.0 to 2.1692.0

## 60.1.0

### Minor Changes

- 6e67597: feat(riff-raff.yaml): Add `minInstancesInServiceParameters` when applicable

  To complement the changes in https://github.com/guardian/riff-raff/pull/1383,
  add the `minInstancesInServiceParameters` property to the `riff-raff.yaml` file when applicable.

## 60.0.0

### Major Changes

- 1105831: Set CPU architecture of ECS tasks to ARM64
- 8e1c15f: ECS task now uses GuVpc.subnetsFromParameter rather than defaulting to CDK context

  Note that this is a breaking change, because the previous behaviour was [this](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions_tasks.EcsRunTask.html#subnets)
  - which relied on a CDK context file with details of the different subnets.

### Patch Changes

- 3d26489: Update aws-cdk to 2.166.0, aws-cdk-lib to 2.166.0, constructs to 10.4.2

## 59.5.6

### Patch Changes

- 55c7c09: Update aws-cdk to 2.162.1, aws-cdk-lib to 2.162.1, constructs to 10.4.2

## 59.5.5

### Patch Changes

- c6fed4d: Update aws-cdk to 2.161.1, aws-cdk-lib to 2.161.1, constructs to 10.3.0
- 81e6c5a: chore(deps): bump `codemaker` from 1.103.1 to 1.104.0

## 59.5.4

### Patch Changes

- 08e6833: Revert mistakenly published version v59.5.3

## 59.5.3

**DO NOT USE**: Published by mistake.

## 59.5.2

### Patch Changes

- 1110a11: fix(experimental-ec2-pattern): Create Policy first

  When deploying Prism with the `GuEc2AppExperimental` for the first time, the deployment failed with the cloud-init-output logs stating:

  ```log
  An error occurred (AccessDenied) when calling the DescribeTargetHealth operation: User: arn:aws:sts::000000000000:assumed-role/prism-CODE-InstanceRolePrism/i-0cee86d64de253ca4 is not authorized to perform: elasticloadbalancing:DescribeTargetHealth because no identity-based policy allows the elasticloadbalancing:DescribeTargetHealth action
  ```

  This suggests the instance update was started before the policy was created.

  Make the ASG depend on the policy that grants these permissions to resolve, as CloudFormation creates dependencies first.

- 5add16c: feat(experimental-ec2-pattern): Tag launch template to improve observability

## 59.5.1

### Patch Changes

- fed2598: fix(experimental-ec2-pattern): Add buffer to rolling update timeout

  If we consider the health check grace period to be the time it takes the "normal" user data to run,
  the rolling update should be configured to be a little longer to cover the additional time spent polling the target group.

  A buffer of 1 minute is somewhat arbitrarily chosen.
  Too high a value, then we increase the time it takes to automatically rollback from a failing healthcheck.
  Too low a value, then we risk flaky deploys.

## 59.5.0

### Minor Changes

- f4e2a7c: feat(experimental-ec2-pattern): Pattern to deploy ASG updates w/CFN

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

## 59.4.0

### Minor Changes

- 43dc653: feat(asg) Collect all ASG level metrics

  This change should have no cost impact:

  > Group metrics are available at one-minute granularity at no additional charge, but you must enable them.
  > – https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-metrics.html.

  If it does, or if you only want a subset, the escape hatch mechanism can be used:

  ```ts
  declare const asg: AutoScalingGroup;

  const cfnAsg = asg.node.defaultChild as CfnAutoScalingGroup;

  cfnAsg.metricsCollection = [
    {
      granularity: "1Minute",
      metrics: [
        // A subset of metrics
      ],
    },
  ];
  ```

## 59.3.5

### Patch Changes

- 9ff96cd: Update aws-cdk to 2.157.0, aws-cdk-lib to 2.157.0, constructs to 10.3.0

## 59.3.4

### Patch Changes

- 7d214d6: Update `git-url-parse` from 14.1.0 to 15.0.0
- 19d41d3: Update `aws-sdk` from 2.1687.0 to 2.1691.0

## 59.3.3

### Patch Changes

- c57b024: Allow inputs in GuScheduledLambda

## 59.3.2

### Patch Changes

- 8e8a20f: Fix bug preventing creation of multiple VPCs in single stack

## 59.3.1

### Patch Changes

- 89dee99: Update aws-cdk to 2.155.0, aws-cdk-lib to 2.155.0, constructs to 10.3.0
- 9412236: Update `aws-sdk` from 2.1674.0 to 2.1687.0
- 481e40d: Update `codemaker` from 1.102.0 to 1.103.1

## 59.3.0

### Minor Changes

- 18daa5d: enable InstanceMetadataTags on EC2 patterns

## 59.2.4

### Patch Changes

- 72c6eec: Update aws-cdk to 2.153.0, aws-cdk-lib to 2.153.0, constructs to 10.3.0
- bef9b1d: Update `aws-sdk` from 2.1670.0 to 2.1674.0

## 59.2.3

### Patch Changes

- 3b90072: Update `codemaker` from 1.101.0 to 1.102.0
- 82016de: Update `aws-sdk` from 2.1665.0 to 2.1670.0

## 59.2.2

### Patch Changes

- c7426d3: Only set an SSL policy on HTTPS application listeners
- 754c919: Update `aws-sdk` from 2.1664.0 to 2.1665.0

## 59.2.1

### Patch Changes

- 7ed3595: Update `aws-sdk` from 2.1649.0 to 2.1664.0.
- 006e3a4: Update `git-url-parse` from 14.0.0 to 14.1.0.

## 59.2.0

### Minor Changes

- 8700b29: feat(asg): Allow setting the defaultInstanceWarmup option on auto scaling groups provisioned by our EC2 pattern

## 59.1.0

### Minor Changes

- 0a0bce1: : feat(asg): Allow setting the detailedMonitoring option on launch templates provisioned by our EC2 patterns

## 59.0.0

### Major Changes

- e15d900: GuCDK EC2 patterns now require an explicit `UserData` or `GuUserDataProps` input, instead of a string.

  The UserData class comes with helpers that allow us to mutate the user data in our patterns which will be helpful with some of our upcoming work.
  Unfortunately whenever a `string` is passed to our patterns we have to wrap it in a special `CustomUserData` class which disables most of these helpers.

  For applications that were already using `GuUserDataProps` no change is required, however applications that used strings will have to make a small change.

  ```js
  new GuEc2App({
    userData: `#!/usr/bin/bash echo "hello world"`,
    ...
  })
  ```

  becomes

  ```js
  const userData = UserData.forLinux();
  userData.addCommands(`echo "hello world"`);

  new GuEc2App({
    userData,
    ...
  })
  ```

  Note that you no longer need to specify a shebang, by default `UserData` adds one for you. If you need to customize this behaviour you can look at the props accepted by `forLinux`.
  You may also want to look at some of the other methods that UserData has to understand if it may be able to help you in other ways, for example `addS3DownloadCommand` the method helps you write commands to download from S3.

## 58.2.0

### Minor Changes

- 59ffa9d: feat(asg): Allow setting the UpdatePolicy on ASGs provisioned by our EC2 patterns
- 689b59a: Bump @guardian/tsconfig to 1.0.0 and specifically set moduleResolution to "node"

## 58.1.4

### Patch Changes

- c015419: Update aws-cdk to 2.148.0, aws-cdk-lib to 2.148.0, constructs to 10.3.0
- 7051a7c: fix(ec2-app): Use `clientSecretValue` prop over deprecated `clientSecret`
- 9cfabc6: fix(lambda): Use `loggingFormat` prop over deprecated `logFormat`

## 58.1.3

### Patch Changes

- 16c7086: Limit the length of the cognito user pool domainPrefix generated by the Ec2App googleAuth functionality to 63 characters
- 816f3a2: bump codemaker from 1.100.0 to 1.101.0
- 94640e9: bump typedoc from 0.26.2 to 0.26.3
- 4eee825: bump @changesets/cli from 2.27.5 to 2.27.7

## 58.1.2

### Patch Changes

- 87242ca: Update aws-cdk to 2.145.0, aws-cdk-lib to 2.145.0, constructs to 10.3.0

## 58.1.1

### Patch Changes

- 1da0da9: Update aws-cdk to 2.141.0, aws-cdk-lib to 2.141.0, constructs to 10.3.0
- c8400c9: Add useful ASG group metrics (TOTAL_INSTANCES, etc) by default

## 58.1.0

### Minor Changes

- 96cb7dc: Use the recommended ELB security policy `ELBSecurityPolicy-TLS13-1-2-2021-06` which includes TLS 1.3, and is backwards compatible with TLS 1.2.

## 58.0.0

### Major Changes

- fa0719b: BREAKING CHANGE: DevX Backups can no longer be enabled via the `withBackup` prop, which has been removed.

  Users should now opt-in/out of DevX Backups at the construct level (i.e. when defining an RDS instance, cluster or
  DynamoDB table).

  We recommend using the `GuDatabaseInstance` or `GuDynamoTable` to help with this. If these constructs cannot be used,
  resources can also be tagged like this: `Tags.of(myDatabase).add("devx-backup-enabled", "true")`.

## 57.1.0

### Minor Changes

- 8bde0ca: Add Dynamodb construct with default deletion protection and mandatory opt-in/opt-out setting for DevX-backup.

## 57.0.0

### Major Changes

- 7cc8591: BREAKING CHANGE:

  Users of the GuDatabaseInstance class now need to explicitly opt-in/out of
  DevX Backups via the devXBackups prop.

### Minor Changes

- 197228b: GuLambdaFunction uses JSON logging by default, for compatibility with ApplicationLogLevel

## 56.0.3

### Patch Changes

- 89a22f1: Update aws-cdk to 2.136.1, aws-cdk-lib to 2.136.1, constructs to 10.3.0

## 56.0.2

### Patch Changes

- a98acf3: Update aws-cdk to 2.134.0, aws-cdk-lib to 2.134.0, constructs to 10.3.0

## 56.0.1

### Patch Changes

- 44788e5: Update aws-cdk to 2.132.0, aws-cdk-lib to 2.132.0, constructs to 10.3.0

## 56.0.0

### Major Changes

- 5fead41: - Load balancers now add headers with information about the TLS version and cipher suite used during negotiation
  - Load balancers now drop invalid headers before forwarding requests to the target. Invalid headers are described as HTTP header names that do not conform to the regular expression [-A-Za-z0-9]+

### Patch Changes

- a551119: Apply the `App` tag to the launch template created in the EC2 App pattern.
- de7c472: Update dependencies
- e1f3751: Fixes a bug where `this.app` on a `GuStack` is always `undefined`, as it is never set.

  See https://github.com/guardian/cdk/pull/1497#issuecomment-1480997050.

## 55.0.0

### Major Changes

- 6c5e701: Use PROD version of cognito-auth-lambdas instead of INFRA.

  We no longer update/use the INFRA version of cognito-auth-lambdas, although we won't be making any breaking changes to these lambdas there may be a situation if a user of CDK does not update for a long while, when they switch from INFRA to PROD they will suddenly receive a lot of updates to their lambdas.

  Users should take care to verify that any applications use Google Auth are still functional.

## 54.1.0

### Minor Changes

- edf5c7a: - Add `readonlyRootFilesystem` prop to specify whether the container is given read-only access to its root file system
  - Add `containerInsights` prop to enable CloudWatch insights
  - Replace deprecated state machine definition

## 54.0.0

### Major Changes

- 4548884: This change includes some potentially breaking changes for consumers of:
  - [`GuEc2App`](https://guardian.github.io/cdk/classes/patterns.GuEc2App.html)
  - [`GuPlayApp`](https://guardian.github.io/cdk/classes/patterns.GuPlayApp.html) (a subclass of `GuEc2App`)
  - [`GuPlayWorkerApp`](https://guardian.github.io/cdk/classes/patterns.GuPlayWorkerApp.html) (a subclass of `GuEc2App`)
  - [`GuNodeApp`](https://guardian.github.io/cdk/classes/patterns.GuNodeApp.html) (a subclass of `GuEc2App`)

  Since [v49.0.2](https://github.com/guardian/cdk/releases/tag/v49.0.2),
  the EC2 instance profile created in `GuEc2App`, and it's subclasses,
  used the [`AmazonSSMManagedInstanceCore`](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html) AWS Managed Policy
  to enable the [SSM+SSH capability](https://github.com/guardian/ssm-scala?tab=readme-ov-file#in-aws).

  In addition to enabling SSM+SSH, this Managed Policy also provided read access to all SSM Parameters.
  This is not least privilege.

  In this version, usage of the `AmazonSSMManagedInstanceCore` Managed Policy is swapped for a custom,
  more minimal, policy.

  > [!IMPORTANT]
  > Before upgrading to this version,
  > ensure your application is not relying on the IAM Policy behaviour provided by `AmazonSSMManagedInstanceCore`.

  If your application is reading SSM Parameters outside the `/STAGE/STACK/APP/*` namespace,
  you will need to add an explicit policy.

  An IAM Policy to read SSM Parameters in the `/STAGE/STACK/APP/*` namespace is already provided by the `GuEc2App` construct,
  via [`GuParameterStoreReadPolicy`](https://guardian.github.io/cdk/classes/constructs_iam.GuParameterStoreReadPolicy.html)

  To understand if your application is impacted,
  consult [this Service Catalogue query](https://metrics.gutools.co.uk/goto/KZhWJVoIg?orgId=1)
  showing CloudFormation stacks using the above _and_ using GuCDK v49.0.2 or above.

  <details><summary>Query ran in Service Catalogue</summary>
  <p>

  ```sql
  with data as (
      select cfn.account_id
           , acc.name as account_name
           , tml.stack_id
           , cfn.last_updated_time
           , cfn.region
           , cfn.stack_name
           , tml.metadata ->> 'gu:cdk:version' as gucdk_version
           , cfn.tags ->> 'gu:repo' as repository
           , cfn.tags ->> 'Stack' as stack
           , cfn.tags ->> 'Stage' as stage
           , cfn.tags ->> 'App' as app
      from    aws_cloudformation_template_summaries tml
              join aws_accounts acc on tml.account_id = acc.id
              join aws_cloudformation_stacks cfn on tml.stack_arn = cfn.arn
      where   tml.metadata is not null
        and (
          (metadata -> 'gu:cdk:constructs')::jsonb ? 'GuEc2App'
              OR (metadata -> 'gu:cdk:constructs')::jsonb ? 'GuPlayApp'
              OR (metadata -> 'gu:cdk:constructs')::jsonb ? 'GuPlayWorkerApp'
              OR (metadata -> 'gu:cdk:constructs')::jsonb ? 'GuNodeApp'
          )
  ),
  ownership as (
      select  distinct full_name
              , galaxies_team
              , team_contact_email
      from    view_repo_ownership
      where   galaxies_team is not null
              and team_contact_email is not null
  )

  select      data.*
              , ownership.galaxies_team
              , ownership.team_contact_email
  from        data
              left join ownership on data.repository = ownership.full_name
  where       gucdk_version like '49%' -- affected version is 49.0.2 onwards, so this will catch some extra stacks, but hopefully not too many!
              OR gucdk_version like '5%';
  ```

  </p>
  </details>

## 53.1.1

### Patch Changes

- ec6bd81: Update aws-cdk to 2.127.0, aws-cdk-lib to 2.127.0, constructs to 10.3.0

## 53.1.0

### Minor Changes

- ac7354f: Support multiple EC2 apps with load balancer access logs enabled

## 53.0.3

### Patch Changes

- 8ead267: Remove direct dependencies that should be peer ones:
  - `aws-cdk-lib`
  - `constructs`

  No change for consumers that provide compatible packages

## 53.0.2

### Patch Changes

- d21b90e: Update aws-cdk to 2.121.1, aws-cdk-lib to 2.121.1, constructs to 10.3.0

## 53.0.1

### Patch Changes

- 2fd963b: Make dependency `@changeset/cli` development only

## 53.0.0

### Major Changes

- af50cf5: Removes supports for Stack Sets (added in #977) as it's no longer used,
  because of a lack of CD tooling support for deploying Stack Sets.

  Removing unused code means less code to maintain, and reduced complexity.

  Should Stack Sets be needed in future, https://github.com/cdklabs/cdk-stacksets offers an alternative approach to creating them in CDK.

## 52.3.1

### Patch Changes

- a473265: fix(deps): Update AWS CDK libraries to 2.114.1, and constructs to 10.3.0

## 52.3.0

### Minor Changes

- 8c40db382: Adds the optional `enableDistributablePolicy` prop to `GuEcsTask` so that consumers of this pattern can decide whether the task IAM role has access to the account's distributable bucket in S3.

## 52.2.1

### Patch Changes

- fcbabb5de: Update AWS CDK libraries to 2.109.0, and constructs to 10.3.0

## 52.2.0

### Minor Changes

- 5ee2c0955: feat(backup): Support backups provided by DevX

  Adds a new property `withBackup` to `GuStack` to enable backups provided by DevX.

  When `true`, all supported resources in the stack will receive a new tag `devx-backup-enabled`.

  To opt in/out an individual resource, you can manually apply this tag.

  See https://github.com/guardian/aws-backup.

## 52.1.0

### Minor Changes

- 8541732ec: feat(riff-raff.yaml): Support cross stack dependencies

  Currently the `riff-raff.yaml` generator is not able to create dependencies between `cloud-formation` deployments. This means each `cloud-formation` deployment could happen at the same time.

  This does not work in the scenario where we have:
  - Stack A containing a bucket
  - Stack B CODE containing an app that uses A's bucket
  - Stack B PROD containing an app that uses A's bucket

  That is, we can't guarantee Stack A is deployed first.

  In this change we add support for the scenario where we have a shared resources stack.
  The generated `riff-raff.yaml` file will describe that Stack B CODE, and Stack B PROD depend on Stack A.

  It uses the AWS CDK mechanism https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Stack.html#addwbrdependencytarget-reason.

## 52.0.0

### Major Changes

- 2fd7d333c: Remove support for classic load balancers.

  Use of application load balancers (ALBs) is considered best practice,
  as ALBs are receiving [more capabilities](https://aws.amazon.com/elasticloadbalancing/features/) than elastic (classic) load balancers (ELBs).
  GuCDK should be encoding best practice, so remove support for ELBs.

  Please adopt application load balancers instead, or if necessary, use ELBs directly from AWS CDK.
