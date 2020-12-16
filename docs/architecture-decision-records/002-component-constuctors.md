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

2. Constrctors should be the best fit for each class

   In the case of this library, this mainly means either missing out the id or changing the order of the id and props inputs. In scenarios where a sensible id can either be hardcoded or defaulted, this would prevent users from having to add ids everywhere, reducing the amount of code they have to write.

## Decision

<!-- What is the change that we're proposing and/or doing? -->

Constructors should follow the following rules for consistency.

1. Constructors should all accept a `scope` of type `GuStack` and an `id` of type `string`

   :white_check_mark: Valid

   ```ts
   class MyConstruct {
     constructor(scope: GuStack, id: string) {
       ...
     }
   }
   ```

   :x: Invalid

   ```ts
   class MyConstruct {
     constructor(scope: Stack, id: string) {
       ...
     }
   }
   ```

2. They can also take a `props` object which should be correctly typed

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
     constructor(scope: GuStack, id: string, props: object) {
       ...
     }
   }
   ```

3. Where all `props` are optional, the `props` object should be optional as a whole

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

4. Where `props` are optional, a default value for the `id` can be provided where appropriate

   :white_check_mark: Valid

   ```ts
   interface MyConstructProps {
     prop1?: string;
     prop2?: string
   }

   class MyConstruct {
     constructor(scope: GuStack, id: string = "MyConstruct", props?: MyConstructProps) {
       ...
     }
   }
   ```

   :x: Invalid

   ```ts
   interface MyConstructProps {...}

   class MyConstruct {
     constructor(scope: GuStack, id: string = "MyConstruct", props: MyConstructProps) {
       ...
     }
   }
   ```

## Consequences

<!-- What becomes easier or more difficult to do because of this change? -->

Having all constructors follow a consistent patterns makes it easier for users of the library as they always know what to expect. The tradeoff is that some constructors may be sub-optimal. Generally this will means passing through an id where we could have defaulted the value which adds slightly to the amount of code required.
