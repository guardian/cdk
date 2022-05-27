/* eslint-disable @typescript-eslint/no-unused-vars -- testing file */

import type { GuApp } from "../../../src/constructs/core";

interface MyProps {
  name: string;
}

const defaultProps: MyProps = { name: "guardian" };

class OneParamConstructor {
  constructor(scope: GuApp) {
    console.log(scope);
  }
}

class TwoParamConstructor {
  constructor(scope: GuApp, props: MyProps) {
    console.log(scope);
    console.log(props);
  }
}

class ThreeParamConstructor {
  constructor(scope: GuApp, id: string, props: MyProps) {
    console.log(scope);
    console.log(id);
    console.log(props);
  }
}

class AnotherThreeParamConstructor {
  constructor(scope: GuApp, id: string, props?: MyProps) {
    console.log(scope);
    console.log(id);
    console.log(props);
  }
}

class YetAnotherThreeParamConstructor {
  constructor(scope: GuApp, id: string, props: MyProps = defaultProps) {
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
