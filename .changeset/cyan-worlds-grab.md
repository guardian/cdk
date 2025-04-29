---
"@guardian/cdk": minor
---

feat(GuEc2App): Replace `enabledDetailedInstanceMonitoring` optional property with mandatory `instanceMetricGranularity` property

Specifying how an ASG service should be monitored is now explicitly required.
When detailed monitoring is enabled, EC2 metrics are produced at a higher granularity of one minute (default is five minutes).
This should allow for earlier horizontal scaling and provide more detail during incident triage.

This change will cost roughly $3 per instance per month.
We'd recommend using detailed monitoring for production environments.

See also:
- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-detailed-monitoring.html
- https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
