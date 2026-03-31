---
"@guardian/cdk": patch
---

Introduce a withoutPolicyChecks flag to GuDeveloperPolicy properties so that the check can be turned off.

Provide instructions for use of that flag in the "overbroad" action/resource error text.

This enables teams to use fully wildcarded actions and resources when needed, but also provides information in
cloudformation metadata to allow us to track the usage of that switch in order to study how often this is 
needed.
