# @guardian/cdk

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
