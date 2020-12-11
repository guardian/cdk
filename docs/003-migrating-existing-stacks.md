# Migrating to CDK

## Getting started

The [AWS CDK CLI](https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html) provides a command to generate
a starter project. From there, you can install this library and get started defining your new stack.

The [Guardian CDK CLI](https://github.com/guardian/cdk-cli) can be used to generate the boiler plate for you stack and to migrate across parameters from existing cloudformation templates.

## Comparing outputs

When migrating to CDK, there are two steps which can be useful in giving confidence that nothing significant has changed
before applying the new template.

Firstly, you can generate a diff between the template and the CDK synthesized output. This will allow you to see in detail
the difference between the two. Expect to see quite a few changes! The [Changes](#Changes) section below details a number
that you may see.

Before applying the new template, you can generate a change set. This will show which resources are going to be created,
modified and removed. Importantly, it will also show if any modifications required a replacement. This is more important
for particular resources, where the resource is referenced elsewhere by arn and this would cause a change. Viewing the
further change set details will give more information about the reason for the change to each resource.

## Changes

When comparing the output of your CDK and the original cloudformation, you'll likely see a number of changes due
to differing default values and the way that CDK constructs some resources for you. Below is a list of some of the
differences that we've encountered so far with an explanation of why they've come about and what implications this has.

### InstanceProfile Path

Typically, with explicitly defined instance profiles, the path value was set to `/`.
Now that the instance profile resource is created automagically by the autoscaling group,
the path value is not set but the default value is `/`.

### LoadBalancer -> AppSecurityGroup Egress

In stacks with a load balancer and autoscaling group, typically a security group was defined explicitly
for each with an ingress rule to the app security group from the loadbalancer security group. This ingress
is now created automatically as a separate resource by the autoscaling group. As well as the ingress, an egress
from the loadbalancer security group is created.

### AutoscalingGroup Availability Zones

When defining an autoscaling group in cloudformation, an `AvailabilityZones` property was sometimes provided e.g.

```yaml
AvailabilityZones:
  - Fn::Select:
      - 0
      - Fn::GetAZs: ""
  - Fn::Select:
      - 1
      - Fn::GetAZs: ""
```

as well as the `VPCZoneIdentifier` property.

According to the [documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-as-group.html#cfn-as-group-availabilityzones), only one of the properties is required (unless you're using EC2-Classic in which case the AZs property is required.)

The CDK synthesized template does not contain the `AvailabilityZones` property and there is no obvious way of adding it. Accordinly to the
[documentation](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-autoscaling.AutoScalingGroup.html) of the component:

```
The ASG spans the availability zones specified by vpcSubnets, falling back to the Vpc default strategy if not specified.
```

which suggests that the `AvailabilityZones` property is not required.

### Security Group Egress

In cloudformation, many security groups did not define an egress, relying instead on the
default behaviour. That is not possible with CDK as you only have the option to either allow
or disallow all outbound traffic. For some stacks, disabling all outbound traffic may be okay
but for others it can cause issues. You can see what the current security group egress rules are
in the AWS console.

### LoadBalancer listeners for HTTP and HTTPS

In cloudformation, for the LoadBalancer listeners typically only the `Protocol` value was set.
This defines the protocol that a listener rule listens for. In CDK it is possible to define one
or both of `internalProtocol` and `externalProtocol`. If you only define one then it defaults to
be the same as the other. This becomes problematic when forwarding both HTTP and HTTPS traffic to
the same port as it causes an error. When listening to both HTTP and HTTPS, forward both sets of
traffic to the ASG using the same protocol.

### RDS DatabaseInstance defaults

By default, an instance of an RDS DatabaseInstance generates a Cloudformation template
with the following default keys and values:

```json
"RDS": {
  "Type": "AWS::RDS::DBInstance",
  "Properties": {
    ...
    "CopyTagsToSnapshot": true
    ...
  }
}
```

- `CopyTagsToSnapshot` is added and defaults to `true` if not otherwise specified
- `UpdateReplacePolicy` is added and follows the value of `DeletionPolicy` if it is specified
