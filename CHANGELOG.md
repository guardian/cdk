# @guardian/cdk

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
