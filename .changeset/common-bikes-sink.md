---
"@guardian/cdk": minor
---

Minor improvements to the GuDeveloperPolicy class to make it more intuitive for users.
* path includes source repo name to help map the policy back from AWS to its source codebase
* path includes stage as we have nowhere else to find it and will help potentially with filtering
* friendlyName is now a required attribute that maps to the managed policy's description
* The policy must have at least one statement
* permission attribute is now called grantId to match with the corresponding Janus structure
