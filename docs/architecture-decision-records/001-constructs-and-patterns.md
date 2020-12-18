# Constructs and Patterns

## Status

<!--- What is the status, such as proposed, accepted, rejected, deprecated, superseded, etc.? -->

proposed

## Context

<!--- What is the issue that we're seeing that is motivating this decision or change? -->

The AWS CDK provides components with two levels of abstraction. CfnComponents map directly to cloudformation resources whilst constructs are a higher abstraction which may create multiple related resources. For example, the `AutoScalingGroup` construct will also create `LaunchConfig` and `SecurityGroup` resources. This is a useful abstraction as it allows you to define all the components required for a particular concept in one place.

Further to this, various patterns are available - both AWS supported and open source. These patterns define an entire stack, based around common template. For example, a `EC2App` pattern might provide an `AutoScalingGroup`, `LoadBalancer` and the required `Roles` and `SecurityGroups`. These patterns are likely composed of multiple constrcuts (rather than CfnComponents) under-the-hood.

This library aims to standardise and simplify the process of setting up Guardian stacks by providing reusable components but what level(s) of abstraction should be provided?

## Positions

<!--- What are the differing positions or proposals on this issue? -->

1. Provide Constructs only

   Constructs would give teams components they can use to get sensbile Guardian settings by default but with the flexibility to architect there stacks however they choose.

2. Provide both Constructs and Patterns

   Providing both patterns and constructs gives teams the flexibility to use constructs where required but also the ability to standup standard stacks with minimal effort. It also brings even greater standardisation and allows more complex features to be built in "for free".

## Decision

<!-- What is the change that we're proposing and/or doing? -->

This library should define a number of Guardian flavoured constructs which extend those provided by the AWS CDK library with Guardian defaults baked in. For example, a `GuAutoScalingGroup` and `GuApplicationLoadBalancer`.

Where those constructs are used in multiple ways, it should provide utlity classes for any common usages. For example, for the `Policy` constructs: `GuSSMPolicy`, `GuLogShippingPolicy` and `GuGetS3ObjectPolicy`

Built on top of those, it should also provide a number of patterns to cover common Guardian stack architectures. For example, `GuEC2App` and `GuLambdaApp` patterns. These patterns should be the encouraged entry point to the library, with the constructs only used outside of standard cases.

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

Providing patterns makes the developer experience far quicker and simpler in cases where developers are standing up standard stack types. From a maintainence viewpoint, it adds some complexity in designing, building and maintaing the patterns.
