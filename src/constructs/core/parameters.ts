import type { CfnParameterProps } from "@aws-cdk/core";
import { CfnParameter } from "@aws-cdk/core";
import { RegexPattern, Stage, Stages } from "../../constants";
import type { GuStack } from "./stack";

export interface GuParameterProps extends CfnParameterProps {
  fromSSM?: boolean;
}

export type GuNoTypeParameterProps = Omit<GuParameterProps, "type">;

export class GuParameter extends CfnParameter {
  public readonly id: string;

  constructor(scope: GuStack, id: string, props: GuParameterProps) {
    super(scope, id, {
      ...props,
      type: props.fromSSM ? `AWS::SSM::Parameter::Value<${props.type ?? "String"}>` : props.type,
    });

    this.id = id;
    scope.setParam(this);
  }
}

export class GuStringParameter extends GuParameter {
  constructor(scope: GuStack, id: string, props: GuNoTypeParameterProps) {
    super(scope, id, { ...props, type: "String" });
  }
}

export class GuStageParameter extends GuParameter {
  public static readonly defaultId = "Stage";
  constructor(scope: GuStack, id: string = GuStageParameter.defaultId) {
    super(scope, id, {
      type: "String",
      description: "Stage name",
      allowedValues: Stages,
      default: Stage.CODE,
    });
  }
}

export class GuStackParameter extends GuParameter {
  public static readonly defaultId = "Stack";
  constructor(scope: GuStack, id: string = GuStackParameter.defaultId) {
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

export class GuCertificateArnParameter extends GuStringParameter {
  constructor(scope: GuStack, id: string = "TLSCertificate", props?: GuNoTypeParameterProps) {
    super(scope, id, {
      ...props,
      allowedPattern: RegexPattern.ACM_ARN,
      constraintDescription: "Must be an ACM ARN resource",
    });
  }
}

export class GuDistributionBucketParameter extends GuStringParameter {
  public static parameterName = "DistributionBucketName";

  constructor(scope: GuStack, id: string = GuDistributionBucketParameter.parameterName) {
    super(scope, id, {
      description: "SSM parameter containing the S3 bucket name holding distribution artifacts",
      default: "/account/services/artifact.bucket",
      fromSSM: true,
    });
  }
}
