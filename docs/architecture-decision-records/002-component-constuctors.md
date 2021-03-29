# Component Constructors

## Status

<!--- What is the status, such as proposed, accepted, rejected, deprecated, superseded, etc.? -->

proposed

## Context

<!--- What is the issue that we're seeing that is motivating this decision or change? -->

This project contains a large number of classes, making up the various constructs and patterns. The project is intended to be used as a component library and, therefore, used by a number of people who don't have extensive knowledge of either the CDK or this library. It is therefore important to make the experience of using these classes as intuitive as possible.

## Positions

<!--- What are the differing positions or proposals on this issue? -->

1. Constructors should be the same or as similar as possible for consistency

   By having a consistent style for constructors, users will know what to expect every time they use a class from the library. This makes the developer experience easier and faster as users do not have to check what is required for each class.

2. Constructors should be the best fit for each class

   In the case of this library, this mainly means either missing out the id or changing the order of the id and props inputs. In scenarios where a sensible id can either be hardcoded or defaulted, this would prevent users from having to add ids everywhere, reducing the amount of code they have to write.

## Decision

<!-- What is the change that we're proposing and/or doing? -->

Constructors should follow the following rules for consistency.

1. The first parameter should be a `scope` of type `GuStack`:

   :white_check_mark: Valid

   ```ts
   class MyConstruct {
     constructor(scope: GuStack) {
       ...
     }
   }
   ```

   :x: Invalid

   ```ts
   class MyConstruct {
     constructor(scope: Stack) {
       ...
     }
   }
   ```

   The construct/pattern will then have a static `id` as it will never change, for example the `Stage` parameter.

2. They can also take a `props` object which should be correctly typed:

   :white_check_mark: Valid

   ```ts
   class MyConstruct {
     constructor(scope: GuStack, props: MyConstructProps) {
       ...
     }
   }
   ```

   :x: Invalid

   ```ts
   class MyConstruct {
     constructor(scope: Stack, props: object) {
       ...
     }
   }
   ```

   The construct/pattern will then derive `id` from `props` as it will never change, for example `InstanceTypeFor${props.app}`.

3. They can also take an `id` of type string and a `props` object which should be correctly typed

   :white_check_mark: Valid

   ```ts
   interface MyConstructProps {...}

   class MyConstruct {
     constructor(scope: GuStack, id: string, props: MyConstructProps) {
       ...
     }
   }
   ```

   :x: Invalid

   ```ts
   class MyConstruct {
     constructor(scope: GuStack, id: any, props: object) {
       ...
     }
   }
   ```

4. Where all `props` are optional, the `props` object should be optional as a whole

   :white_check_mark: Valid

   ```ts
   interface MyConstructProps {
     prop1?: string;
     prop2?: string
   }

   class MyConstruct {
     constructor(scope: GuStack, id: string, props?: MyConstructProps) {
       ...
     }
   }
   ```

   :x: Invalid

   ```ts
   interface MyConstructProps {
     prop1?: string;
     prop2?: string
   }

   class MyConstruct {
     constructor(scope: GuStack, id: string, props: MyConstructProps) {
       ...
     }
   }
   ```

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

Having all constructors follow a consistent patterns makes it easier for users of the library as they always know what to expect. The tradeoff is that some constructors may be sub-optimal. Generally this will means passing through an id where we could have defaulted the value which adds slightly to the amount of code required.
