import { SynthUtils } from "@aws-cdk/assert";
import { OrganizationPrincipal } from "@aws-cdk/aws-iam";
import { Topic } from "@aws-cdk/aws-sns";
import { RegexPattern } from "../../constants";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuStackForStackSetInstance, GuStringParameter } from "../core";
import { GuKinesisStream } from "../kinesis";
import { GuSnsTopic } from "../sns";
import { GuStackSet } from "./stack-set";

describe("The GuStackSet construct", () => {
  it("should correctly provision a stack with a stack set resource", () => {
    const theStackSetInstance = new GuStackForStackSetInstance("the-stack-set", { stack: "test", stage: "TEST" });
    new GuKinesisStream(theStackSetInstance, "account-logging-stream");

    const parentStack = simpleGuStackForTesting({ stack: "test" });

    new GuStackSet(parentStack, "StackSet", {
      name: "my-stack-set",
      description: "this stack set provisions some common infrastructure",
      organisationUnitTargets: ["o-12345abcde"],
      stackSetInstance: theStackSetInstance,
    });

    expect(SynthUtils.toCloudFormation(parentStack)).toMatchSnapshot();
  });

  it("should support parameters in the stack set instance", () => {
    const theStackSetInstance = new GuStackForStackSetInstance("the-stack-set", { stack: "test", stage: "TEST" });
    Topic.fromTopicArn(
      theStackSetInstance,
      "central-topic",
      new GuStringParameter(theStackSetInstance, "CentralSnsTopicArn", { allowedPattern: RegexPattern.ARN })
        .valueAsString
    );

    const awsOrgId = "o-12345abcde";
    const parentStack = simpleGuStackForTesting({ stack: "test" });
    const centralTopic = new GuSnsTopic(parentStack, "account-alerts");
    centralTopic.grantPublish(new OrganizationPrincipal(awsOrgId));

    new GuStackSet(parentStack, "StackSet", {
      name: "my-stack-set",
      description: "this stack set provisions some common infrastructure",
      organisationUnitTargets: [awsOrgId],
      stackSetInstance: theStackSetInstance,
      stackSetInstanceParameters: {
        CentralSnsTopicArn: centralTopic.topicArn,
      },
    });

    expect(SynthUtils.toCloudFormation(parentStack)).toMatchSnapshot();
  });

  it("should error if the parent stack does not specify all parameters for the stack set instance template", () => {
    const theStackSetInstance = new GuStackForStackSetInstance("the-stack-set", { stack: "test", stage: "TEST" });
    new GuStringParameter(theStackSetInstance, "CentralSnsTopic", { allowedPattern: RegexPattern.ARN });

    const parentStack = simpleGuStackForTesting({ stack: "test" });

    expect(() => {
      new GuStackSet(parentStack, "StackSet", {
        name: "my-stack-set",
        description: "this stack set provisions some common infrastructure",
        organisationUnitTargets: ["o-12345abcde"],
        stackSetInstance: theStackSetInstance,
      });
    }).toThrow("There are undefined stack set parameters: CentralSnsTopic");
  });
});
