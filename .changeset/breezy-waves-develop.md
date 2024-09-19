---
"@guardian/cdk": patch
---

fix(experimental-ec2-pattern): Add buffer to rolling update timeout

If we consider the health check grace period to be the time it takes the "normal" user data to run,
the rolling update should be configured to be a little longer to cover the additional time spent polling the target group.

A buffer of 1 minute is somewhat arbitrarily chosen.
Too high a value, then we increase the time it takes to automatically rollback from a failing healthcheck.
Too low a value, then we risk flaky deploys.
