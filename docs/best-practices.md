# Best Practices

## Guardian CDK builds in best practices:
- [Blocks SSH port](https://github.com/guardian/cdk/blob/5a2b429704e324a298e5a348aadf9ab311858bec/src/constructs/ec2/security-groups/base.ts#L58-L60) - uses [SSM-Scala](https://github.com/guardian/ssm-scala) instead
- Limits the public subnet to things that need to be communicated with (e.g. [load balancers](https://github.com/guardian/cdk/blob/4a8e7d55998d31115a590c01752e363603cf6728/src/patterns/ec2-app.ts#L415-L420))
- Everything else is in the [private subnet](https://github.com/guardian/cdk/blob/4a8e7d55998d31115a590c01752e363603cf6728/src/patterns/ec2-app.ts#L400) (e.g. apps, servers, databases)
- [Tags](https://github.com/guardian/cdk/blob/4a8e7d55998d31115a590c01752e363603cf6728/src/constructs/core/stack.ts#L149-L154) resources with [stack, stage and app](https://github.com/guardian/recommendations/blob/ddd2fbd50554cd5d07e42c925e29e5c539807082/AWS.md#general)

## Best practice recommendations:
- Test using jest and snapshots
- Upload the json output file produced by running `cdk synth` is preferable to uploading a `cloudformation.yaml` file

For instance, this is preferable:
```
"synth": "mkdir -p ./build/cdk.out && cdk synth --output ./build/cdk.out > ./build/cdk.out/<project-name>.json"
```
to this:
```
"synth": "mkdir -p ./build/cdk.out && cdk synth --output ./build/cdk.out > ./build/cloudformation.yaml"
```
Uploading the `cloudformation.yaml` file doesn't guarantee the file will contain yaml. This wouldn't be picked up at the
CI step, but would fail at the RiffRaff deployment step, causing a confusing failure.

Uploading the json output file has the benefit that it would alert at CI if the json file hadn't been created properly,
alerting about failure sooner!

