---
"@guardian/cdk": patch
---

Add the option to create a WAF parameter to GuEc2App.

Various projects use WAF to protect their load balancer.  This is implemented by an SSM Parameter which is picked up by WAF configuration.

Rather than have multiple projects create the param, it is now possible to simply mark the GuEc2App as WAF enabled, and the param will be created with a standard format.
