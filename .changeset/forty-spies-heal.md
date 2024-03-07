---
"@guardian/cdk": major
---

- Load balancers now add headers with information about the TLS version and cipher suite used during negotiation
- Load balancers now drop invalid headers before forwarding requests to the target. Invalid headers are described as HTTP header names that do not conform to the regular expression [-A-Za-z0-9]+
