# @guardian/cdk

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
