import { readFileSync } from "fs";
import { join } from "path";
import type { IGrantable, IPrincipal } from "@aws-cdk/aws-iam";
import { Policy, PolicyStatement } from "@aws-cdk/aws-iam";
import { Code, Runtime, SingletonFunction } from "@aws-cdk/aws-lambda";
import type { Reference } from "@aws-cdk/core";
import { Construct, CustomResource, Duration } from "@aws-cdk/core";
import { AwsCustomResourcePolicy } from "@aws-cdk/custom-resources";
import type { CustomResourceGetParameterProps } from "./custom-resources/interfaces";
import type { AppIdentity } from "./identity";
import type { GuStack } from "./stack";

export interface GuSSMParameterProps {
  parameter: string;
  secure?: boolean;
}

export interface GuSSMIdentityParameterProps extends GuSSMParameterProps, AppIdentity {}

const stripped = (str: string) => str.replace(/[-/]/g, "");

export class GuSSMParameter extends Construct implements IGrantable {
  private readonly customResource: CustomResource;
  readonly grantPrincipal: IPrincipal;

  // eslint-disable-next-line custom-rules/valid-constructors -- TODO: Remove once linting rules have been relaxed for this
  constructor(scope: GuStack, props: GuSSMParameterProps) {
    const { parameter } = props;

    const id = (id: string) => {
      const now = Date.now();
      // We need to create UIDs for the resources in this construct, as otherwise CFN will not trigger the lambda on updates for resources that appear to be the same
      const uid = now.toString().substr(now.toString().length - 4);
      return parameter.toUpperCase().includes("TOKEN") ? `${id}-token-${uid}` : `${id}-${stripped(parameter)}-${uid}`;
    };

    super(scope, id("GuSSMParameter"));

    const provider = new SingletonFunction(scope, id("Provider"), {
      code: Code.fromInline(readFileSync(join(__dirname, "/custom-resources/runtime/lambda.js")).toString()),
      runtime: Runtime.NODEJS_12_X,
      handler: "index.handler",
      uuid: "eda001a3-b7c8-469d-bc13-787c4e13cfd9",
      lambdaPurpose: "Lambda to fetch SSM parameters",
      timeout: Duration.minutes(2),
    });

    this.grantPrincipal = provider.grantPrincipal;

    const policy = new Policy(scope, id("CustomResourcePolicy"), {
      statements: [
        new PolicyStatement({
          actions: ["ssm:getParameter"],
          resources: AwsCustomResourcePolicy.ANY_RESOURCE, // This feels too permissive, but possibly okay
        }),
      ],
    });

    if (provider.role !== undefined) {
      policy.attachToRole(provider.role);
    }

    const getParamsProps: CustomResourceGetParameterProps = {
      apiRequest: { Name: parameter, WithDecryption: props.secure },
    };

    this.customResource = new CustomResource(this, id("Resource"), {
      resourceType: "Custom::GuGetSSMParameter",
      serviceToken: provider.functionArn,
      pascalCaseProperties: false,
      properties: { getParamsProps: JSON.stringify(getParamsProps) },
    });

    // If the policy was deleted first, then the function might lose permissions to delete the custom resource
    // This is here so that the policy doesn't get removed before onDelete is called
    this.customResource.node.addDependency(policy);
  }

  public getValueReference(): Reference {
    return this.customResource.getAtt("Parameter.Value");
  }

  public getValue(): string {
    return this.customResource.getAttString("Parameter.Value");
  }
}

/*
 * Assumes the path of `/${STAGE}/${STACK}/${APP}/${parameter}`
 *
 * */
export class GuSSMIdentityParameter extends GuSSMParameter {
  // eslint-disable-next-line custom-rules/valid-constructors -- this may not be necessary going forward
  constructor(scope: GuStack, props: GuSSMIdentityParameterProps) {
    super(scope, { ...props, parameter: `/${scope.stage}/${scope.stack}/${props.app}/${props.parameter}` });
  }
}
