import { AppIdentity } from "../identity";
import type { GuStack } from "../stack";
import { GuParameter } from "./base";
import type { GuNoTypeParameterPropsWithAppIdentity } from "./base";

export class GuAmiParameter extends GuParameter {
  constructor(scope: GuStack, props: GuNoTypeParameterPropsWithAppIdentity) {
    super(scope, AppIdentity.suffixText(props, "AMI"), {
      type: "AWS::EC2::Image::Id",
      description: `Amazon Machine Image ID for the app ${props.app}. Use this in conjunction with AMIgo to keep AMIs up to date.`,
      ...props,
    });
  }
}
