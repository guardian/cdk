---
"@guardian/cdk": minor
---

Add a class for safe instantiation of managed policies with a specific structure of path
which enables them to be discoverable.

This enables teams to define sets of permissions which are re-usable and can be used to 
create credentials suitable to approach a given workload, consistent with the Principle
of Least Privilege.  This is preferred to existing workflows where a wide-ranging
developer role is used.

These can be reused in multiple locations, so, for example, an EC2 instance can be given
a specific set of permissions which are also identically available for a support task.
Changing one would then change the other, ensuring encapsulation of requirements in a 
single place.
