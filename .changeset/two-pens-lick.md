---
"@guardian/cdk": minor
---

Setting `updatePolicy` on EC2 patterns and GuAutoScalingGroups configures instances to only report as Healthy once they pass the ALB health checks.
It also disables the default behaviour of GuCDK to add an `autoscaling` deployment step to the generated RiffRaff YAML file as rotating the instances is now handled by Cloudformation.
