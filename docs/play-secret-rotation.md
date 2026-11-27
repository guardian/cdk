# Rotating a Play application secret on EC2 and ECS

`GuPlayApp`, `GuPlayWorkerApp` and `GuLoadBalancedAppExperimental` can opt in to automated Play secret rotation. One scheduled Lambda updates the existing Systems Manager (SSM) Parameter Store `SecureString`, regardless of how many EC2 instances or ECS tasks serve the app. The application roles receive read-only access. This does not install or configure the Play library.

## Enable rotation

1. Check that [`play-secret-rotation`](https://github.com/guardian/play-secret-rotation/tree/HEAD/aws-parameterstore) already reads the same parameter in the stack's account and Region. Verify that the app can read both the current and previous versions. Keep the parameter outside CloudFormation value management so deployments do not write another version.
2. Add `playSecretRotation` to the Play pattern props. For example, with `Duration` imported from `aws-cdk-lib`:

   ```typescript
   playSecretRotation: {
     parameterName: "/CODE/my-stack/my-app/play-secret",
     interval: Duration.hours(6),
     usageDelay: Duration.minutes(3),
     overlapDuration: Duration.hours(2),
   },
   ```

   Match `usageDelay` and `overlapDuration` to the app's `SecretSupplier` settings. The usage delay must let replicas refresh their caches before they start signing with the new secret. The interval must be a whole number of minutes, between five minutes and six days, and longer than the sum of both timings. Leave margin for scheduling delays. The existing parameter must accept a 43-character URL-safe value (letters, digits, `_` and `-`).

   On ECS, set `playSecretRotation` on `GuLoadBalancedAppExperimental` alongside `ecsProps`. The Play library reads at runtime using the ECS task role. Do not inject this parameter as an ECS container secret: ECS injects values at task startup only. In a hybrid deployment, configure both fleets to read the same parameter and use the same transition timings. The pattern creates one writer and grants read access to both application roles.

3. For an Advanced parameter, set `parameterTier: "Advanced"`. For a customer-managed key, supply the existing key as `kmsKey`, for example using `Key.fromKeyArn` with the `key/…` ARN, not an `alias/…` ARN. Parameter Store may still report an alias, but that alias must continue to point to the configured key. If the key policy does not delegate to IAM, arrange for the Lambda role to use it via SSM (`kms:Encrypt` for Standard or `kms:GenerateDataKey` for Advanced), and for the app role to decrypt both versions via SSM. If the previous version uses another key, retain app access to that key through the transition. Do not change the parameter's tier or key while the writer is enabled.
4. Check the CDK diff. If it creates a new writer, disable any prior automated writer and let in-flight invocations finish before enabling the new schedule. Stop manual updates and retain both fleets' read access while they serve traffic. Only one stack should own the writer for a given parameter. Do not delete or recreate the parameter while the writer is enabled: Parameter Store does not offer conditional versioned writes, so the metadata check cannot protect against an external writer or deletion racing an update.
5. Verify first on a non-production fleet. Confirm from Parameter Store metadata that the version advances once per successful rotation; do not fetch or log the value. With cookies issued before rotation, check that multiple instances or tasks accept them through the overlap and switch to signing with the new secret after the usage delay. For a hybrid deployment, check both fleets.

CloudWatch alarms track Lambda failures and missing successful rotations. The missed-rotation alarm checks for any success in a rolling window of one rotation interval plus two minutes for reporting. Success metrics use the scheduled run time, not the time CloudWatch receives the log. Duplicate samples do not extend the window or increase the result. The five-minute minimum leaves enough time for an evaluation to detect the gap before the next scheduled run. A new alarm may be in `ALARM` until the first success. Set `snsTopicName` to route the alerts to a specific SNS topic; otherwise they use the app's monitoring topic, if configured. A delayed or duplicate event may be skipped to protect the active transition.

To disable rotation, remove `playSecretRotation` and deploy. The existing parameter and its history are untouched. If the app relies on access added by the feature, retain equivalent `ssm:GetParameters` and KMS decrypt access before disabling it.
