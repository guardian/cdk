---
"@guardian/cdk": minor
---

Update `GuLoadBalancedAppExperimental` with an option to enable "ssh" onto the application container.
See https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-exec-run.html.

Capabilities in the container is dictated by the image.
For example, if the image doesn't have `curl` available, you won't be able to `curl localhost:9000`.

NOTE: When enabled, FSBP ECS.5 is actively violated.
