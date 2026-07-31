import { Template } from "aws-cdk-lib/assertions";
import { ComparisonOperator } from "aws-cdk-lib/aws-cloudwatch";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { simpleGuStackForTesting } from "../../utils/test";
import type { GuStack } from "../core";
import { GuLambdaFunction } from "../lambda";
import { GuAlarm, GuAlarmCta } from "./alarm";

describe("The GuAlarm class", () => {
  const lambda = (stack: GuStack) =>
    new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });

  it("should create a CloudWatch alarm", () => {
    const stack = simpleGuStackForTesting();
    new GuAlarm(stack, "alarm", {
      app: "testing",
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda(stack).metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
    });
    Template.fromStack(stack).resourceCountIs("AWS::CloudWatch::Alarm", 1);
  });

  const snsActionsCFN = [
    {
      "Fn::Join": [
        "",
        [
          "arn:aws:sns:",
          {
            Ref: "AWS::Region",
          },
          ":",
          {
            Ref: "AWS::AccountId",
          },
          ":alerts-topic",
        ],
      ],
    },
  ];

  it("should send alerts to the provided SNS Topic", () => {
    const stack = simpleGuStackForTesting();
    new GuAlarm(stack, "alarm", {
      app: "testing",
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda(stack).metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
      okAction: false,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmActions: snsActionsCFN,
    });
    template.resourcePropertiesCountIs(
      "AWS::CloudWatch::Alarm",
      {
        OkActions: snsActionsCFN,
      },
      0,
    );
  });

  it("should send OK alerts to the provided SNS Topic, if `okAction: true`", () => {
    const stack = simpleGuStackForTesting();
    new GuAlarm(stack, "alarm", {
      app: "testing",
      alarmName: `Alarm in ${stack.stage}`,
      alarmDescription: "It's broken",
      metric: lambda(stack).metricErrors(),
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      threshold: 1,
      evaluationPeriods: 1,
      snsTopicName: "alerts-topic",
      okAction: true,
    });
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      OKActions: snsActionsCFN,
    });
  });

  it("should generate the correct log link from an elk space", () => {
    const scope = simpleGuStackForTesting({ app: "myapp" });
    const testLink = new GuAlarmCta(scope, {
      elkSpace: "aaa",
    }).ctaLinks;
    expect(testLink).toEqual([
      "https://logs.gutools.co.uk/s/aaa/app/discover#/?" +
        "_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-1d,to:now))" +
        "&" +
        "_a=(" +
        "columns:!(stack,stage,message,app)," +
        "filters:!(" +
        "('$state':(store:appState),meta:(alias:!n,disabled:!f,key:stack.keyword,negate:!f,params:(query:test-stack),type:phrase),query:(match_phrase:(stack.keyword:test-stack)))," +
        "('$state':(store:appState),meta:(alias:!n,disabled:!f,key:app.keyword,negate:!f,params:(query:myapp),type:phrase),query:(match_phrase:(app.keyword:myapp)))," +
        "('$state':(store:appState),meta:(alias:!n,disabled:!f,key:stage.keyword,negate:!f,params:(query:TEST),type:phrase),query:(match_phrase:(stage.keyword:TEST))))," +
        "hideChart:!t,interval:auto,query:(language:kuery,query:exception),sort:!(!('@timestamp',desc)))",
    ]);
  });

  it("should generate the correct log link from a link", () => {
    const scope = simpleGuStackForTesting();
    const testLink = new GuAlarmCta(scope, {
      link: "https://www.example.com",
    }).ctaLinks;
    expect(testLink).toEqual(["https://www.example.com"]);
  });
});
