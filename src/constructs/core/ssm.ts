import { readFileSync } from "fs";
import { join } from "path";
import type { IGrantable, IPrincipal } from "@aws-cdk/aws-iam";
import { Policy, PolicyStatement } from "@aws-cdk/aws-iam";
import { Code, Runtime, SingletonFunction } from "@aws-cdk/aws-lambda";
import type { Reference } from "@aws-cdk/core";
import { Construct, CustomResource, Duration } from "@aws-cdk/core";
import { AwsCustomResourcePolicy } from "@aws-cdk/custom-resources";
import type { CustomResourceGetParameterProps } from "./custom-resources/interfaces";
import type { GuStack } from "./stack";

export interface GuSSMParameterProps {
  secure?: boolean;
  /*
   * Assumes the path of `/${STAGE}/${STACK}/${APP}/${param}`
   * */
  defaultPath: boolean;
}

const stripped = (str: string) => str.replace(/[-/]/g, "");

export class GuSSMParameter extends Construct implements IGrantable {
  private readonly customResource: CustomResource;
  readonly grantPrincipal: IPrincipal;

  // eslint-disable-next-line custom-rules/valid-constructors -- I think stating an ID would be overkill for this, but happy to discuss
  constructor(scope: GuStack, param: string, props?: GuSSMParameterProps) {
    // TODO: Establish if this is an accepted, safe way of creating IDs
    const id = (id: string) =>
      param.toUpperCase().includes("TOKEN") ? `${id}-token-${Date.now()}` : `${id}-${stripped(param)}`;

    super(scope, id("GuSSMParameter"));

    const provider = new SingletonFunction(scope, id("Provider"), {
      code: Code.fromInline(readFileSync(join(__dirname, "/custom-resources/runtime/lambda.js")).toString()),
      // runtime: new Runtime("nodejs14.x", RuntimeFamily.NODEJS, { supportsInlineCode: true }), -- we can use Node14 once we bump the version of @aws-cdk to v1.94 https://github.com/aws/aws-cdk/releases/tag/v1.94.0
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

    const fullParamName = props?.defaultPath ? `/${scope.stage}/${scope.stack}/${scope.app}/${param}` : param;

    const getParamsProps: CustomResourceGetParameterProps = {
      apiRequest: { Name: fullParamName, WithDecryption: props?.secure },
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
    console.log(this.customResource.toString());
    return this.customResource.getAtt("Parameter.Value");
  }

  public getValue(): string {
    console.log(this.customResource.toString());
    return this.customResource.getAttString("Parameter.Value");
  }
}

export function GuSSMDefaultParam(scope: GuStack, param: string): GuSSMParameter {
  return new GuSSMParameter(scope, param, { defaultPath: true });
}
