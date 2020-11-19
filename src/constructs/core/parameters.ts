import type { CfnParameterProps, Construct } from "@aws-cdk/core";
import { CfnParameter } from "@aws-cdk/core";
import { Stage, Stages } from "../../constants";

export type GuParameterProps = CfnParameterProps;

export type GuNoTypeParameterProps = Omit<GuParameterProps, "type">;

export class GuParameter extends CfnParameter {
  static defaultProps: GuParameterProps = {};

  constructor(scope: Construct, id: string, props: GuParameterProps) {
    super(scope, id, { ...GuParameter.defaultProps, ...props });
  }
}

export class GuStringParameter extends GuParameter {
  constructor(scope: Construct, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, { ...props, type: "String" });
  }
}

export class GuStageParameter extends GuParameter {
  constructor(scope: Construct) {
    super(scope, "Stage", {
      type: "String",
      description: "Stage name",
      allowedValues: Stages,
      default: Stage.CODE,
    });
  }
}

export class GuStackParameter extends GuParameter {
  constructor(scope: Construct) {
    super(scope, "Stack", {
      type: "String",
      description: "Name of this stack",
      default: "deploy",
    });
  }
}

// TODO: Is there a way of removing default props if they weren't implemented before?
//       Should that be allowed even if it is possible?
export class GuInstanceTypeParameter extends GuParameter {
  static defaultProps: GuParameterProps = {
    type: "String",
    description: "EC2 Instance Type",
    default: "t3.small",
  };

  constructor(scope: Construct, id: string = "InstanceType", props: GuParameterProps = {}) {
    super(scope, id, { ...GuInstanceTypeParameter.defaultProps, ...props });
  }
}

export class GuSSMParameter extends GuParameter {
  static defaultProps: GuParameterProps = {
    noEcho: true,
  };

  constructor(scope: Construct, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...GuSSMParameter.defaultProps,
      ...props,
      type: "AWS::SSM::Parameter::Value<String>",
    });
  }
}

export class GuSubnetListParameter extends GuParameter {
  static defaultProps: GuParameterProps = {};

  constructor(scope: Construct, id: string, props: GuNoTypeParameterProps) {
    super(scope, "Subnets", {
      ...GuSubnetListParameter.defaultProps,
      ...props,
      type: "List<AWS::EC2::Subnet::Id>",
    });
  }
}

export class GuVpcParameter extends GuParameter {
  static defaultProps: GuParameterProps = {};

  constructor(scope: Construct, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...GuVpcParameter.defaultProps,
      ...props,
      type: "AWS::EC2::VPC::Id",
    });
  }
}

export class GuAmiParameter extends GuParameter {
  static defaultProps: GuParameterProps = {};

  constructor(scope: Construct, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...GuAmiParameter.defaultProps,
      ...props,
      type: "AWS::EC2::Image::Id",
    });
  }
}
