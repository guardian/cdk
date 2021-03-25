/* eslint-disable @typescript-eslint/no-unused-vars -- testing file */

import type { GuStack } from "../../src/constructs/core";

interface MyProps {
  name: string;
}

const defaultProps: MyProps = { name: "guardian" };

class OneParamConstructor {
  constructor(scope: GuStack) {
    console.log(scope);
  }
}

class TwoParamConstructor {
  constructor(scope: GuStack, props: MyProps) {
    console.log(scope);
    console.log(props);
  }
}

class ThreeParamConstructor {
  constructor(scope: GuStack, id: string, props: MyProps) {
    console.log(scope);
    console.log(id);
    console.log(props);
  }
}

class AnotherThreeParamConstructor {
  constructor(scope: GuStack, id: string, props?: MyProps) {
    console.log(scope);
    console.log(id);
    console.log(props);
  }
}

class YetAnotherThreeParamConstructor {
  constructor(scope: GuStack, id: string, props: MyProps = defaultProps) {
    console.log(scope);
    console.log(id);
    console.log(props);
  }
}

class PrivateConstructor {
  private constructor(number: number) {
    console.log(number);
  }
}
