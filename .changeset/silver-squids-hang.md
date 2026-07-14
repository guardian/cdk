---
"@guardian/cdk": minor
---

Adds deterministic routing rules for EC2 to ECS migrations.

Allow callers to force a request to a specific target group
using an HTTP header rather than relying on the default weighted routing.

Example usage:

```
curl -i -H 'X-Gu-Target-Group: ecs' https://cdk-playground.code.dev-gutools.co.uk
```
