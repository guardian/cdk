---
"@guardian/cdk": minor
---

feat(GuCertificate): Remove `DeletionPolicy` and `UpdateReplacePolicy`

Typically, the `DeletionPolicy` is set to support CloudFormation imports.
The `AWS::CertificateManager::Certificate` resource does not yet support CFN imports.

See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import-supported-resources.html.
