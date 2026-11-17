---
"@guardian/cdk": patch
---

Update `GuLoadBalancedAppExperimental` to run the stock AWS for Fluent Bit image as its logging sidecar, instead of the Guardian-built `guardian/cdk/logging` image.

The Guardian Fluent Bit configuration is now passed to the sidecar in environment variables and written to a writable volume mounted at `/tmp`. The sidecar no longer needs permission to pull from the `guardian/cdk/logging` ECR repository. The shipped log records are unchanged.
