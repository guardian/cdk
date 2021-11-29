import { CfnAnomalyMonitor, CfnAnomalySubscription } from "@aws-cdk/aws-ce";
import { RegexPattern } from "../../constants";
import type { GuStackForInfrastructure } from "../core";
import { GuStringParameter } from "../core";

interface GuCostAnomalyMonitorProps {
  /**
   * The frequency that anomaly reports are sent over email.
   *
   * @default IMMEDIATE
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ce-anomalysubscription.html#cfn-ce-anomalysubscription-frequency
   */
  frequency: "DAILY" | "IMMEDIATE" | "WEEKLY";

  /**
   * The dollar value that triggers a notification if the threshold is exceeded.
   *
   * @default 50
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ce-anomalysubscription.html#cfn-ce-anomalysubscription-threshold
   */
  threshold: number;
}

/**
 * Monitor AWS spend using AWS Cost Anomaly Detection
 *
 * @see https://aws.amazon.com/aws-cost-management/aws-cost-anomaly-detection/
 */
export class GuCostAnomalyEmailMonitor extends CfnAnomalyMonitor {
  constructor(scope: GuStackForInfrastructure, id: string, props?: GuCostAnomalyMonitorProps) {
    const { frequency, threshold }: GuCostAnomalyMonitorProps = {
      frequency: "IMMEDIATE",
      threshold: 50,
      ...props,
    };

    super(scope, id, {
      monitorType: "DIMENSIONAL",
      monitorName: id,
    });

    const recipientEmailAddress = new GuStringParameter(scope, "EmailRecipient", {
      allowedPattern: RegexPattern.GUARDIAN_EMAIL,
    }).valueAsString;

    new CfnAnomalySubscription(scope, `${id}Subscription`, {
      monitorArnList: [this.attrMonitorArn],
      frequency,
      subscribers: [{ type: "EMAIL", address: recipientEmailAddress }],
      subscriptionName: `${id}Subscription`,
      threshold,
    });
  }
}
