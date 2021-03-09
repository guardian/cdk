import type { GuStack } from "../stack";
import type { GuNoTypeParameterProps } from "./base";
import { GuParameter } from "./base";

export class GuInstanceTypeParameter extends GuParameter {
  constructor(scope: GuStack, id: string = "InstanceType", props?: GuNoTypeParameterProps) {
    super(scope, id, {
      type: "String",
      description: "EC2 Instance Type",
      default: "t3.small",
      ...props,
    });
  }
}

export class GuAmiParameter extends GuParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      type: "AWS::EC2::Image::Id",
    });
  }
}
