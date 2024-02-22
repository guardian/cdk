---
"@guardian/cdk": minor
---

- Load balancers now add headers with information about the TLS version and cipher suite used during negotiation
- Load balancers now drop invalid headers before forwarding requests to the target
