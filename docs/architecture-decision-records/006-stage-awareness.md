# Stage Awareness

## Status
Accepted. Implemented since [v39.0.0](https://github.com/guardian/cdk/releases/tag/v39.0.0).

## Context
It is best practise to use to produce a single artifact for use on all stages of an application.
This provides confidence that, should the artifact be deployed to PROD, it'll behave the same as it did when tested on CODE.

It is also best practise to employ continuous delivery of infrastructure. We use Riff-Raff.

It is common to vary infrastructure based on the stage. For example:
  - An ASG in PROD typically has a higher capacity than CODE as it receives more traffic
    - PROD typically also uses more powerful instance types for the same reason
  - The domain name for PROD will be different from CODE

Let's call these "stage aware values".

How should `@guardian/cdk` (GuCDK) support stage aware values?

## Status Quo
Within YAML CloudFormation templates, we achieve stage awareness using:
  - A `Stage` [parameter][cfn-param]
  - A [`Mapping`][cfn-mapping]
  - The [`FindInMap`][cfn-find] intrinsic function

We have a single YAML template artifact for use in the CODE and PROD stage, and it contains fragments such as:

```yaml
Parameters:
  Stage:
    Type: String
    Default: CODE
    AllowedValues:
      - CODE
      - PROD
    Description: Stage name
Mappings:
  myapp:
    CODE:
      minInstances: 1
      maxInstances: 2
    PROD:
      minInstances: 3
      maxInstances: 6
Resources:
  AutoScalingGroupMyApp:
  Type: AWS::AutoScaling::AutoScalingGroup
  Properties:
    MaxSize:
      Fn::FindInMap:
        - myapp
        - Ref: Stage
        - maxInstances
    MinSize:
      Fn::FindInMap:
        - myapp
        - Ref: Stage
        - minInstances
```

Note, there are some drawbacks to this model:
  - Not all stacks use the `CODE`/`PROD` nomenclature [^1]. In these cases, teams edit (or entirely remove) the `AllowedValue` property from the `Stage` parameter.
  - `FindInMap` fails if a key cannot be found, and this failure is only seen at runtime, which is quite a long feedback loop.
  - `Mapping`s only support the primitive types of [`String` or `List`](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/mappings-section-structure.html)

How should GuCDK support stage aware values?

And in a way that significantly abstracts (or removes!) the listed drawbacks from the user, and provides a shorter feedback loop.

## Positions
Each position will be evaluated on the following criteria:
  - Adherence to the best practice of producing a single, deterministic, artifact
  - Adherence to the best practice of continuous delivery of infrastructure
  - Support stacks that do not use `CODE` or `PROD`
  - The simplicity of the API presented to users
  - How short the feedback loop is
  - Ease of maintenance

### 1. Replicate the model employed by YAML templates, creating a parameter, `Mapping`, and use the intrinsic`FindInMap` function.

This will be most familiar to teams, therefore the migration path to GuCDK is that much simpler.

It is worth noting that use of these structures is against the [AWS CDK recommendations][cdk-recommendations]:

> In traditional AWS CloudFormation scenarios, your goal is to produce a single artifact that is parameterized so
> that it can be deployed to various target environments after applying configuration values specific to those environments.
> In the CDK, you can, and should, build that configuration right into your source code. Create a stack for your production environment,
> and a separate one for each of your other stages, and put the configuration values for each right there in the code.

Regarding implementation of this option, there are two versions.

#### 1.1 Both constructs and patterns are stage aware
This will provide a consistent API between constructs and patterns. Those stacks that do not match a pattern can still use the raw constructs and benefit from their encoding of best practices.
However, it also produces an amount of duplicated code in the codebase.

#### 1.2 Only patterns are stage aware
With only patterns being stage aware, the issues identified in 1.1 are somewhat alleviated; patterns will pass primitive types into constructs.
This means using a construct directly in a stage aware form becomes a little more difficult, however it reinforces the idea that patterns are the default entry point to the project.

#### Score
- :white_check_mark: Adherence to the best practice of producing a single, deterministic, artifact
  - `cdk synth` will create a single CloudFormation template file
- :white_check_mark: Adherence to the best practice of continuous delivery of infrastructure
  - Riff-Raff supports the deployment of a single CloudFormation template file
- :x: Support stacks that do not use `CODE` or `PROD`
  - In order to support all possible stages [^1] in a typesafe way, it's likely the resulting code within GuCDK will be difficult to reason about
  - GuCDK could enforce the use of `CODE`, `PROD` or `INFRA` only
- :x: The simplicity of the API presented to users
  - It would be possible for GuCDK to present a strongly typed API for any primitive type, however stronger types, such as [`InstanceType`][cdk-instance-type], will not be supported
  - In this solution, `Stage`, being a parameter, is a [token][cdk-token], and cannot be used to perform logic. This is confusing and often causes runtime errors.
- :white_check_mark: How short the feedback loop is
  - The resulting CloudFormation template would look similar to how we write YAML CloudFormation
  - The type system can help ensure we don't suffer from `FindInMap` issues listed above
- :x: Ease of maintenance
  - Although the type system could be used for guidance, in order to produce a stage aware component we'd either have to copy/paste some boilerplate, or introduce complex abstractions
  - As this solution is directly against the recommendations from AWS, it might limit the evolution of GuCDK

### 2. Provide a set of patterns and constructs with primitive types and the user provides a `Mapping` and `FindInMap` as needed
- :white_check_mark: Adherence to the best practice of producing a single, deterministic, artifact
  - `cdk synth` will create a single CloudFormation template file
- :white_check_mark: Adherence to the best practice of continuous delivery of infrastructure
  - Riff-Raff supports the deployment of a single CloudFormation template file
- :white_check_mark: Support stacks that do not use `CODE` or `PROD`
  - Users would be able to specify their own stages
- :x: The simplicity of the API presented to users
  - Users would have to create a Mapping themselves each time
    - Creating [mappings within CDK][cdk-mapping] is quite verbose
    - Goes against some aims of GuCDK which is to simplify infrastructure, making it easy to follow best practices
  - Stronger, more type safe types such as [`InstanceType`][cdk-instance-type], will not be supported
- :x: How short the feedback loop is
  - Likely to be no faster than hand-writing a YAML template
- :white_check_mark: Ease of maintenance
  - There will be no code to handle stage awareness in GuCDK. No code is the best code!

### 3. Add native `cdk` support to Riff-Raff, our CD tool
- :white_check_mark: Adherence to the best practice of producing a single, deterministic, artifact
- :white_check_mark: Adherence to the best practice of continuous delivery of infrastructure
- :white_check_mark: Support stacks that do not use `CODE` or `PROD`
- :x: The simplicity of the API presented to users
  - Stage dependent values will be placed in the [CDK context][cdk-context], which is good
  - This solution would likely require our build artifacts follow the [Cloud Assembly spec][cloud-assembly]. This is a departure from the status quo and a big, possibly breaking, change.
- :white_check_mark: How short the feedback loop is
  - We'd be using `cdk` exactly how AWS suggest, using all their tooling which is quite mature now with good DX
- :x: Ease of maintenance
  - This solution would require significant changes to Riff-Raff
  - The `cdk` toolkit is only available as a CLI tool, and there are no known plans for a Java SDK to be supported

### 4. Produce a CloudFormation template for each stage
In this model, we step away from the "best practice" of using the exact same artifact between stages.
However, the artifact will be produced by the same CDK pipeline, and thus we retain the deterministic characteristic.

For a stack to gain stage-awareness, one would simply instantiate the same class:

```ts
class MyStack extends GuStack { } // `GuStack` is provided by GuCDK

new MyStack(scope, "MyStack", {
 stack: "the-stack",
 stage: "PROD",
 minCapacity: 3,
 domainName: "example.com"
});

new MyStack(scope, "MyStack", {
 stack: "the-stack",
 stage: "CODE",
 minCapacity: 1,
 domainName: "code.example.com"
});
```
#### Score
- :white_check_mark: Adherence to the best practice of producing a single, deterministic, artifact
  - Whilst not a _single_ artifact, it is deterministic
  - Unit or snapshot tests can be used to ensure the resulting template across stages only differ in property values and not the overall infrastructure
- :x: (but possible :white_check_mark:) Adherence to the best practice of continuous delivery of infrastructure
  - Riff-Raff does not currently support the use of a different file per stage
- :white_check_mark: Support stacks that do not use `CODE` or `PROD`
- :white_check_mark: The simplicity of the API presented to users
  - The user defines the shape of input to `MyStack` and can use _any_ type, including strong types such as [`InstanceType`][cdk-instance-type]
- :white_check_mark: How short the feedback loop is
  - Standard `cdk` workflows can be employed
- :white_check_mark: Ease of maintenance
  - Inline with [AWS CDK recommendations][cdk-recommendations]
  - A small change to Riff-Raff would be needed. However, this it should be possible to do this in a non-breaking way.

## Decision

Produce a CloudFormation template for each stage.

## Consequences

Riff-Raff would require some changes to enable the use of a different CloudFormation template file depending on the stage being deployed.

The `riff-raff.yaml` would likely look like this:

```yaml
stacks:
  - playground
regions:
  - eu-west-1
deployments:
  cloudformation:
    type: cloud-formation
    app: cdk-playground
    parameters:
      templateStagePath: # <- NEW!
        CODE: CdkPlayground.CODE.template.json
        PROD: CdkPlayground.PROD.template.json
```

This will mean the adoption of GuCDK requires the editing of `riff-raff.yaml` in addition to creating a `cdk` directory in a repository.

## Notes
- At the time of writing GuCDK currently implements 1.2 and the proposal is to move to 4
- The suggested edit to the `riff-raff.yaml` schema to include `templateStagePath` is precedented by the [`templateStageParameters`][templateStageParameters] property

[cfn-param]: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html
[cfn-mapping]: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/mappings-section-structure.html
[cfn-find]: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-findinmap.html
[cdk-recommendations]: https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html#best-practices-apps
[cdk-context]: https://docs.aws.amazon.com/cdk/v2/guide/context.html
[cdk-token]: https://docs.aws.amazon.com/cdk/v2/guide/tokens.html
[cdk-instance-type]: https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ec2.InstanceType.html
[cdk-mapping]: https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_core.CfnMapping.html
[cdk-deploy]: https://docs.aws.amazon.com/cdk/v2/guide/cli.html#cli-deploy
[cloud-assembly]: https://github.com/aws/aws-cdk/blob/master/packages/@aws-cdk/cloud-assembly-schema/README.md
[templateStageParameters]: https://github.com/guardian/riff-raff/blob/424e6819acdb3d047dd76138e0720439bbad0fe3/magenta-lib/src/main/scala/magenta/deployment_type/CloudFormation.scala#L48-L61

[^1]: Known values of `Stage` include, but are not limited to:
    - PROD
    - CODE
    - TEST
    - INFRA
    - PROD-AARDVARK
    - CODE-AARDVARK
    - PROD-ZEBRA
    - CODE-ZEBRA
