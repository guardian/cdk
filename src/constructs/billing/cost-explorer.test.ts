import { SynthUtils } from "@aws-cdk/assert";
import { simpleInfraStackForTesting } from "../../utils/test";
import { GuCostAnomalyEmailMonitor } from "./cost-explorer";

describe("The GuCostAnomalyEmailMonitor construct", () => {
  it("should create the correct resources with minimal config", () => {
    const stack = simpleInfraStackForTesting();
    new GuCostAnomalyEmailMonitor(stack, "CostAnomalyMonitor");

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });
});
