# @guardian/cdk

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
