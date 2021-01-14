import type { CfnParameterProps } from "@aws-cdk/core";
import { CfnParameter } from "@aws-cdk/core";
import { RegexPattern, Stage, Stages } from "../../constants";
import type { GuStack } from "./stack";

export type GuParameterProps = CfnParameterProps;

export type GuNoTypeParameterProps = Omit<GuParameterProps, "type">;

export class GuParameter extends CfnParameter {
  constructor(scope: GuStack, id: string, props: GuParameterProps) {
    super(scope, id, props);
  }
}

export class GuStringParameter extends GuParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, { ...props, type: "String" });
  }
}

export class GuStageParameter extends GuParameter {
  constructor(scope: GuStack, id: string = "Stage") {
    super(scope, id, {
      type: "String",
      description: "Stage name",
      allowedValues: Stages,
      default: Stage.CODE,
    });
  }
}

export class GuStackParameter extends GuParameter {
  constructor(scope: GuStack, id: string = "Stack") {
    super(scope, id, {
      type: "String",
      description: "Name of this stack",
      default: "deploy",
    });
  }
}

export class GuInstanceTypeParameter extends GuParameter {
  constructor(scope: GuStack, id: string = "InstanceType", props: GuParameterProps = {}) {
    super(scope, id, {
      type: "String",
      description: "EC2 Instance Type",
      default: "t3.small",
      ...props,
    });
  }
}

export class GuSSMParameter extends GuParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      type: "AWS::SSM::Parameter::Value<String>",
    });
  }
}

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

export class GuAmiParameter extends GuParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      type: "AWS::EC2::Image::Id",
    });
  }
}

export class GuArnParameter extends GuStringParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      allowedPattern: RegexPattern.ARN,
      constraintDescription: "Must be a valid ARN, eg: arn:partition:service:region:account-id:resource-id",
    });
  }
}

export class GuS3ObjectArnParameter extends GuStringParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      allowedPattern: RegexPattern.S3ARN,
      constraintDescription:
        "Must be a valid S3 ARN, see https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html",
    });
  }
}

export class GuGuardianEmailSenderParameter extends GuStringParameter {
  constructor(scope: GuStack, id: string = "EmailSenderAddress", props?: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      allowedPattern: RegexPattern.GUARDIAN_EMAIL,
      constraintDescription: "Must be an @theguardian.com email address",
    });
  }
}
