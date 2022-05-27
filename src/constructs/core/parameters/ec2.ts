import type { GuApp } from "../app";
import { GuParameter } from "./base";

export class GuAmiParameter extends GuParameter {
  constructor(scope: GuApp) {
    super(scope, "AMI", {
      type: "AWS::EC2::Image::Id",
      description: `Amazon Machine Image ID for the app ${scope.app}. Use this in conjunction with AMIgo to keep AMIs up to date.`,
    });
  }
}
