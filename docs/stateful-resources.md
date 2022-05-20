# Stateful Resources
We'll define a stateful resource as one that will cause downtime for users of the application if accidentally deleted.

This may include, for example:
- Databases
- Messaging streams (Kinesis, SNS, SQS)
- S3 Buckets

The recommendation is to employ CD via Riff-Raff with your CDK stack. See [here](setting-up-a-gucdk-project.md) for more detail.

One of the benefits this brings is Riff-Raff, by default, will not perform a deployment if it will result in the removal of a [stateful resource](https://github.com/guardian/riff-raff/blob/9d3f994e0e4f78dd7d2d4c37588a94ac5b45636f/magenta-lib/src/main/scala/magenta/tasks/SetStackPolicyTask.scala#L29-L71). That is, Riff-Raff protects stateful resources.

However, we should not depend on Riff-Raff as there's no guarantee that it's exhaustive.

For this reason, it's important to understand why a resource (stateful or otherwise) might be deleted from a stack.

## Why a stateful resource might be deleted
### Changes to a resource's Logical ID
Within the anatomy of a CloudFormation template, logical IDs are used to uniquely identify resources.

Indeed, from the [AWS CloudFormation docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resources-section-structure.html):

> The logical ID must be alphanumeric (A-Za-z0-9) and unique within the template. Use the logical name to reference the resource in other parts of the template.

A change to a logical ID is viewed as a deletion of one resource, and creation of a new one.

From the [AWS CDK docs](https://docs.aws.amazon.com/cdk/v2/guide/identifiers.html#identifiers_logical_ids):

> Avoid changing the logical ID of a resource after it has been created. Since AWS CloudFormation identifies resources by their logical ID, if you change the logical ID of a resource, AWS CloudFormation deletes the existing resource, and then creates a new resource with the new logical ID, which may cause service interruption or data loss.

### Property updates
When updating the properties of some [resources](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html), AWS is unable to perform the update in place. This is indicated by the "Update requires" section of the property definition, and further described [here](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-update-behaviors.html).

In most instances, replacement is expected:
- [S3 bucket name](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket.html#cfn-s3-bucket-name)
- [DynamoDB table key schema](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html#cfn-dynamodb-table-keyschema)

In some instances, replacement is expected but not destructive:
- [EC2 launch configuration user data](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-autoscaling-launchconfiguration.html#cfn-autoscaling-launchconfiguration-userdata)

In some instances, replacement is unexpected:
- [Security group description](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html#cfn-ec2-securitygroup-groupdescription)
- [Application load balancer type](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-loadbalancer.html#cfn-elasticloadbalancingv2-loadbalancer-type)

## What can be done
At a minimum, CD of your infrastructure with RIff-Raff should be configured. To provide a shorter feedback loop, the following can be used.

### Logical ID
When authoring a stack using GuCDK every resource will be added to a `GuStack`:

```typescript
class MyStack extends GuStack {
  constructor(app: App, id: string, props: GuStackProps) {
    super(app, id, props);

    // resources for my stack
    new Bucket(this, "DataBucket");
  }
}
```

When `MyStack` is synthesized into a CloudFormation template, we'll have a resource with a logical ID of `DataBucket<GUID>` as AWS CDK attempts to create uniqueness.

When wanting to preserve the logical ID for a resource, one can call `overrideLogicalId` on `GuStack`:

```typescript
class MyStack extends GuStack {
  constructor(app: App, id: string, props: GuStackProps) {
    super(app, id, props);

    // resources for my stack
    const dataBucket = new Bucket(this, "DataBucket");
    this.overrideLogicalId(dataBucket, {
      logicalId: "DataBucket",
      reason: "Retaining a stateful resource previously defined in YAML"
    });
  }
}
```

Now, the synthesized template will have a resource with a logical ID of `DataBucket` (the `reason` is purely used to communicate to other developers why we're using a static logical ID).

### Property updates
AWS CDK wants to apply sensible default values to resource properties, for example retention policies on DynamoDB tables.

Sometimes, however, it sets an optional property which, when changed, triggers a replacement. An example of this is the `ApplicationLoadBalancer` construct's setting of the `Type` property.

GuCDK provides some constructs that essentially unset these properties. For example `GuApplicationLoadBalancer`. Please consult the [docs](https://guardian.github.io/cdk/) for more examples.

### Use the CDK CLI
We can perform a diff on a CDK stack and the template of a running CloudFormation stack using the [CDK CLI](https://docs.aws.amazon.com/cdk/v2/guide/cli.html).

When using the GuCDK project generator, this has been wrapped in the `diff` script:

```shell
npm run diff -- --profile <AWS PROFILE NAME> <STACK ID FROM bin/cdk.ts>
```

We can also use the CDK CLI to create a [change set](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html):

```shell
npx cdk deploy --no-execute --profile <AWS PROFILE NAME> <STACK ID FROM bin/cdk.ts>
```

The `--no-execute` flag is critical here, without it the change set will be [applied](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets-execute.html)!

This will print a detailed, colour coded, summary of changes:
  - Red for resource deletion
  - Yellow for resource update
  - Green for resource creation
