import {GuStack, GuStringParameter} from "../constructs/core";
import {GuFunctionProps, GuLambdaFunction} from "../constructs/lambda";
import * as ram from 'aws-cdk-lib/aws-ram';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';

interface GuPinboardChatBotProps extends GuFunctionProps {
  /* This is the 'handle' that will be used in Pinboard, via the @ symbol. e.g. ChatGuPT, HelloWorld etc. */
  chatBotShorthand: string;
  /* This is the description presented to users when hovering over the chatbot, so please explain what the bot does. */
  chatBotDescription: string;
  /* Get this from GuardianAwsAccounts.Workflow in @guardian/private-infrastructure-config */
  workflowAccountId: string;
}

export class GuPinboardChatBot extends GuLambdaFunction {

  constructor(scope: GuStack, id: string, {chatBotShorthand, chatBotDescription, workflowAccountId, ...props}: GuPinboardChatBotProps) {
    super(scope, id, props);

    const pinboardLambdaRoleARN = new GuStringParameter(scope, `PinboardLambdaRoleArn-${chatBotShorthand}`, {
      fromSSM: true,
      default: `arn:aws:ssm:eu-west-1:${workflowAccountId}:parameter/pinboard/${scope.stage}/chatBotBrokerLambdaRoleArn`
    }).valueAsString;

    this.addPermission(`PinboardChatBotInvokePermission-${chatBotShorthand}`, {
      principal: new iam.ArnPrincipal(pinboardLambdaRoleARN),
      action: 'lambda:InvokeFunction',
    });

    const chatBotLambdaArnSsmParam = new ssm.StringParameter(scope, `PinboardChatBotArn-${chatBotShorthand}`, {
      tier: ssm.ParameterTier.ADVANCED, // so it can be shared cross-account via AWS RAM
      parameterName: `/pinboard/bots/${scope.stage}/${chatBotShorthand}`,
      description: chatBotDescription,
      stringValue: this.functionArn
    });

    // expose the chatbot lambda ARN as an SSM parameter, so it can be retrieved by the Pinboard database bridge lambda
    new ram.CfnResourceShare(scope, `PinboardChatBotResourceShare-${chatBotShorthand}`, {
      allowExternalPrincipals: false, // Guardian org only
      name: `PinboardChatBotResourceShare-${chatBotShorthand}`,
      resourceArns: [chatBotLambdaArnSsmParam.parameterArn],
      principals: [
        new iam.AccountPrincipal(workflowAccountId).arn, // dev access,
        pinboardLambdaRoleARN
      ]
    });
  }
}
