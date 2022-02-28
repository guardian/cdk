import { CfnStackSet } from "@aws-cdk/core";
import type { GuStack, GuStackForStackSetInstance } from "../core";

interface GuStackSetProps {
  /**
   * The contents for `TemplateBody` within a `AWS::CloudFormation::StackSet`.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-stackset.html#cfn-cloudformation-stackset-templatebody
   */
  stackSetInstance: GuStackForStackSetInstance;

  /**
   * The name of the stack set. This will appear in the target account.
   */
  name: string;

  /**
   * A description of the stack set. This will appear in the target account.
   */
  description: string;

  /**
   * AWS Organisation Unit IDs to deploy the stack set into.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudformation-stackset-deploymenttargets.html#cfn-cloudformation-stackset-deploymenttargets-organizationalunitids
   */
  organisationUnitTargets: string[];

  /**
   * The contents for`Parameters` within a `AWS::CloudFormation::StackSet`.
   *
   * Typically, you'll only need parameters if the parent stack creates resources for use in the stack set instances.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-stackset.html#cfn-cloudformation-stackset-parameters
   */
  stackSetInstanceParameters?: Record<string, string>;

  /**
   * Which regions to run the stack set in.
   *
   * @default The region of the parent stack.
   */
  regions?: string[];
}

/**
 * A construct to create a `AWS::CloudFormation::StackSet`.
 *
 * The stack set will be configured to automatically deploy into accounts when they join an AWS Organisation Unit.
 * It's assumed stack sets are only provisioned for infrastructure, therefore the `STAGE` value will always be `INFRA`.
 *
 * Usage:
 * ```typescript
 * // the infrastructure to create in target accounts
 * class AccountAlertTopic extends GuStackForStackSetInstance {
 *   constructor(id: string, props: GuStackProps) {
 *     super(id, props);
 *
 *     new GuSnsTopic(this, "topic-for-alerts");
 *   }
 * }
 *
 * class ParentStack extends GuStackForInfrastructure {
 *   constructor(scope: App, id: string, props: GuStackProps) {
 *     super(scope, id, props);
 *
 *     new GuStackSet(this, `${id}StackSet`, {
 *       stackSetInstance: new AccountAlertTopic("Alerts", { stack: props.stack }),
 *       name: "centralised-alarms",
 *       description: "Provisioning of standard account alerting resources",
 *       organisationUnitTargets: [ "o-abcde12345" ]
 *     });
 *   }
 * }
 *
 * // contents of `bin/cdk.ts`
 * new ParentStack(new App(), "AccountAlarmResources", { stack: "alarms" })
 * ```
 *
 * This will produce a CloudFormation template like this:
 * ```yaml
 * Resources:
 *   AccountAlarmResourcesStackSet:
 *     Type: AWS::CloudFormation::StackSet
 *     Properties:
 *       PermissionModel: SERVICE_MANAGED
 *       StackSetName: centralised-alarms
 *       AutoDeployment:
 *         Enabled: true
 *         RetainStacksOnAccountRemoval: false
 *       Description: Provisioning of standard account alerting resources
 *       Parameters: []
 *       StackInstancesGroup:
 *         - DeploymentTargets:
 *             OrganizationalUnitIds:
 *               - o-abcde12345
 *           Regions:
 *             - Ref: AWS::Region
 *       Tags:
 *         - Key: gu:cdk:version
 *           Value: TEST
 *         - Key: gu:repo
 *           Value: guardian/cdk
 *         - Key: Stack
 *           Value: alarms
 *         - Key: Stage
 *           Value: INFRA
 *       TemplateBody: |-
 *         {
 *           "Resources": {
 *             "topicforalerts57330FBE": {
 *               "Type": "AWS::SNS::Topic",
 *               "Properties": {
 *                 "Tags": [
 *                   {
 *                     "Key": "gu:cdk:version",
 *                     "Value": "TEST"
 *                   },
 *                   {
 *                     "Key": "gu:repo",
 *                     "Value": "guardian/cdk"
 *                   },
 *                   {
 *                     "Key": "Stack",
 *                     "Value": "alarms"
 *                   },
 *                   {
 *                     "Key": "Stage",
 *                     "Value": "INFRA"
 *                   }
 *                 ]
 *               }
 *             }
 *           }
 *         }
 * ```
 *
 * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudformation-stackset.html
 */
export class GuStackSet extends CfnStackSet {
  constructor(scope: GuStack, id: string, props: GuStackSetProps) {
    const stackSetInstanceParameters = props.stackSetInstanceParameters ?? {};

    const params = Object.keys(stackSetInstanceParameters);
    const undefinedStackSetParams = props.stackSetInstance.parameterKeys.filter((_) => !params.includes(_));

    if (undefinedStackSetParams.length !== 0) {
      throw new Error(`There are undefined stack set parameters: ${undefinedStackSetParams.join(", ")}`);
    }

    super(scope, id, {
      stackSetName: props.name,
      description: props.description,
      permissionModel: "SERVICE_MANAGED",
      autoDeployment: {
        enabled: true,
        retainStacksOnAccountRemoval: false,
      },
      stackInstancesGroup: [
        {
          regions: props.regions ?? [scope.region],
          deploymentTargets: {
            organizationalUnitIds: props.organisationUnitTargets,
          },
        },
      ],
      templateBody: props.stackSetInstance.cfnJson,
      parameters: Object.entries(stackSetInstanceParameters).map(([key, value]) => {
        return { parameterKey: key, parameterValue: value };
      }),
    });
  }
}
