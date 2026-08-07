import { Duration } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { simpleGuStackForTesting } from "../../utils/test";
import { GuLambdaFunction } from "../lambda";
import { GuLambdaErrorPercentageAlarm } from "./lambda-alarms";

describe("GuLambdaThrottlingAlarm construct", () => {
  it("should match snapshot", () => {
    const stack = simpleGuStackForTesting();
    new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
      throttlingMonitoring: { snsTopicName: "alerts-topic" },
    });

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});

describe("The GuLambdaErrorPercentageAlarm construct", () => {
  it("should create the correct alarm resource with minimal config", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 80,
      snsTopicName: "alerts-topic",
      lambda: lambda,
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });

  it("should adjust the length of evaluation periods if a custom value is provided", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 65,
      lengthOfEvaluationPeriod: Duration.minutes(5),
      snsTopicName: "alerts-topic",
      lambda: lambda,
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      Metrics: [
        {},
        {},
        {
          MetricStat: {
            Period: 300,
          },
        },
      ],
    });
  });

  it("should adjust the number of evaluation periods if a custom value is provided", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 65,
      numberOfEvaluationPeriodsAboveThresholdBeforeAlarm: 12,
      snsTopicName: "alerts-topic",
      lambda: lambda,
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      EvaluationPeriods: 12,
    });
  });

  it("should use a custom description if one is provided", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 65,
      snsTopicName: "alerts-topic",
      alarmDescription: "test-custom-alarm-description",
      lambda: lambda,
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmDescription: "test-custom-alarm-description",
    });
  });

  it("should use a custom alarm name if one is provided", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 65,
      snsTopicName: "alerts-topic",
      lambda: lambda,
      alarmName: "test-custom-alarm-name",
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmName: "test-custom-alarm-name",
    });
  });

  it("should generate a log link, if `logLink.elkSpace` and `scope.app` are provided", () => {
    const stack = simpleGuStackForTesting({ app: "test" });
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 65,
      snsTopicName: "alerts-topic",
      alarmDescription: "test with space",
      lambda: lambda,
      cta: {
        elkSpace: "example",
      },
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmDescription:
        "test with space\n\nhttps://logs.gutools.co.uk/s/example/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-1d,to:now))&_a=(columns:!(stack,stage,message,app),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,key:stack.keyword,negate:!f,params:(query:test-stack),type:phrase),query:(match_phrase:(stack.keyword:test-stack))),('$state':(store:appState),meta:(alias:!n,disabled:!f,key:app.keyword,negate:!f,params:(query:test),type:phrase),query:(match_phrase:(app.keyword:test))),('$state':(store:appState),meta:(alias:!n,disabled:!f,key:stage.keyword,negate:!f,params:(query:TEST),type:phrase),query:(match_phrase:(stage.keyword:TEST)))),hideChart:!t,interval:auto,query:(language:kuery,query:exception),sort:!(!('@timestamp',desc)))",
    });
  });

  it("should generate a log link, if `logLink.link` is provided", () => {
    const stack = simpleGuStackForTesting();
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 65,
      snsTopicName: "alerts-topic",
      lambda: lambda,
      alarmDescription: "test with link",
      cta: {
        link: "https://www.example.com",
      },
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmDescription: "test with link\n\nhttps://www.example.com",
    });
  });

  it("should generate two links, if `logLink.link`, `logLink.elkSpace` and `scope.app` are all provided", () => {
    const stack = simpleGuStackForTesting({ app: "test" });
    const lambda = new GuLambdaFunction(stack, "lambda", {
      fileName: "lambda.zip",
      handler: "handler.ts",
      runtime: Runtime.NODEJS_12_X,
      app: "testing",
    });
    const props = {
      toleratedErrorPercentage: 65,
      snsTopicName: "alerts-topic",
      alarmDescription: "test with space",
      lambda: lambda,
      cta: {
        link: "https://www.example.com",
        elkSpace: "example",
      },
    };
    new GuLambdaErrorPercentageAlarm(stack, "my-lambda-function", props);
    Template.fromStack(stack).hasResourceProperties("AWS::CloudWatch::Alarm", {
      AlarmDescription:
        "test with space" +
        "\n\nhttps://www.example.com" +
        "\n\nhttps://logs.gutools.co.uk/s/example/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-1d,to:now))&_a=(columns:!(stack,stage,message,app),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,key:stack.keyword,negate:!f,params:(query:test-stack),type:phrase),query:(match_phrase:(stack.keyword:test-stack))),('$state':(store:appState),meta:(alias:!n,disabled:!f,key:app.keyword,negate:!f,params:(query:test),type:phrase),query:(match_phrase:(app.keyword:test))),('$state':(store:appState),meta:(alias:!n,disabled:!f,key:stage.keyword,negate:!f,params:(query:TEST),type:phrase),query:(match_phrase:(stage.keyword:TEST)))),hideChart:!t,interval:auto,query:(language:kuery,query:exception),sort:!(!('@timestamp',desc)))",
    });
  });
});
