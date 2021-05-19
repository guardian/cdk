import { GuParameter } from "./base";
import type { GuStack } from "../stack";
import type { GuNoTypeParameterProps } from "./base";

export class GuSubnetListParameter extends GuParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, { ...props, type: "List<AWS::EC2::Subnet::Id>" });
  }
}

export class GuVpcParameter extends GuParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      type: "AWS::EC2::VPC::Id",
    });
  }
}
