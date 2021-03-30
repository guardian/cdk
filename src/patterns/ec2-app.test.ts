import { SynthUtils } from "@aws-cdk/assert";
import { simpleGuStackForTesting } from "../../test/utils";
import { GuApplicationPorts, GuEc2App } from "./ec2-app";

describe("the GuEC2App pattern", function () {
  it("should compile", function () {
    const stack = simpleGuStackForTesting();
    new GuEc2App(stack, {
      applicationPort: GuApplicationPorts.Node,
      app: "my-amazing-app",
      publicFacing: false,
      userData: "#!/bin/dev foobarbaz",
    });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
