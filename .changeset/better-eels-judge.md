---
"@guardian/cdk": minor
---

Addition of [slow start mode](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html#slow-start-mode)
support for GuEc2AppExperimental.

We recommend enabling this setting if you run a high-traffic service, particularly if it is JVM-based.
