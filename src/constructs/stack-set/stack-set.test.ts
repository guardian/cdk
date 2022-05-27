import { Template } from "aws-cdk-lib/assertions";
import { OrganizationPrincipal } from "aws-cdk-lib/aws-iam";
import { Topic } from "aws-cdk-lib/aws-sns";
import { RegexPattern } from "../../constants";
import { simpleTestingResources } from "../../utils/test";
import { GuApp, GuStackForStackSetInstance, GuStringParameter } from "../core";
import { GuKinesisStream } from "../kinesis";
import { GuSnsTopic } from "../sns";
import { GuStackSet } from "./stack-set";

describe("The GuStackSet construct", () => {
  it("should correctly provision a stack with a stack set resource", () => {
    const theStackSetInstance = new GuStackForStackSetInstance("the-stack-set", { stack: "test", stage: "TEST" });
    const stackSetInstanceApp = new GuApp(theStackSetInstance, "the-stack-set-app");
    new GuKinesisStream(stackSetInstanceApp, "account-logging-stream");

    const { stack: parentStack, app } = simpleTestingResources({ stack: "test" });
    new GuStackSet(app, "StackSet", {
      name: "my-stack-set",
      description: "this stack set provisions some common infrastructure",
      organisationUnitTargets: ["o-12345abcde"],
      stackSetInstance: theStackSetInstance,
    });

    expect(Template.fromStack(parentStack).toJSON()).toMatchSnapshot();
  });

  it("should support parameters in the stack set instance", () => {
    const theStackSetInstance = new GuStackForStackSetInstance("the-stack-set", { stack: "test", stage: "TEST" });
    const stackSetInstanceApp = new GuApp(theStackSetInstance, "the-stack-set-app");
    Topic.fromTopicArn(
      theStackSetInstance,
      "central-topic",
      new GuStringParameter(stackSetInstanceApp, "CentralSnsTopicArn", { allowedPattern: RegexPattern.ARN })
        .valueAsString
    );

    const awsOrgId = "o-12345abcde";
    const { stack: parentStack, app } = simpleTestingResources({ stack: "test" });
    const centralTopic = new GuSnsTopic(app, "account-alerts");
    centralTopic.grantPublish(new OrganizationPrincipal(awsOrgId));

    new GuStackSet(app, "StackSet", {
      name: "my-stack-set",
      description: "this stack set provisions some common infrastructure",
      organisationUnitTargets: [awsOrgId],
      stackSetInstance: theStackSetInstance,
      stackSetInstanceParameters: {
        CentralSnsTopicArn: centralTopic.topicArn,
      },
    });

    expect(Template.fromStack(parentStack).toJSON()).toMatchSnapshot();
  });

  it("should error if the parent stack does not specify all parameters for the stack set instance template", () => {
    const theStackSetInstance = new GuStackForStackSetInstance("the-stack-set", { stack: "test", stage: "TEST" });
    const stackSetInstanceApp = new GuApp(theStackSetInstance, "the-stack-set-app");
    new GuStringParameter(stackSetInstanceApp, "CentralSnsTopic", { allowedPattern: RegexPattern.ARN });

    const { app } = simpleTestingResources({ stack: "test" });

    expect(() => {
      new GuStackSet(app, "StackSet", {
        name: "my-stack-set",
        description: "this stack set provisions some common infrastructure",
        organisationUnitTargets: ["o-12345abcde"],
        stackSetInstance: theStackSetInstance,
      });
    }).toThrow("There are undefined stack set parameters: CentralSnsTopic");
  });
});
