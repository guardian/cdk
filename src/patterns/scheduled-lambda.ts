import type { Schedule } from "@aws-cdk/aws-events";
import type { GuStack } from "../constructs/core";
import { GuLambdaFunction } from "../constructs/lambda";
import type { GuFunctionProps } from "../constructs/lambda";
import type { ErrorPercentageMonitoring } from "./lambda-alarms";
import { GuLambdaErrorPercentageAlarm } from "./lambda-alarms";

interface GuScheduledLambdaProps extends Omit<GuFunctionProps, "rules" | "apis"> {
  schedule: Schedule;
  monitoringConfiguration?: ErrorPercentageMonitoring;
}

export class GuScheduledLambda extends GuLambdaFunction {
  constructor(scope: GuStack, id: string, props: GuScheduledLambdaProps) {
    const lambdaProps: GuFunctionProps = {
      ...props,
      rules: [{ schedule: props.schedule }],
    };
    super(scope, id, lambdaProps);
    if (props.monitoringConfiguration) {
      new GuLambdaErrorPercentageAlarm(scope, "error-percentage-alarm-for-scheduled-lambda", {
        ...props.monitoringConfiguration,
        lambda: this,
      });
    }
  }
}
