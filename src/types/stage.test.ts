import { Stage, StageForInfrastructure } from "../constants";
import { StageAwareValue } from "./stage";

describe("StageAwareValue user defined type guards", () => {
  it("should correctly identify input", () => {
    expect(
      StageAwareValue.isStageValue({
        [Stage.CODE]: "some value for CODE",
        [Stage.PROD]: "some value for PROD",
      })
    ).toBeTruthy();

    expect(
      StageAwareValue.isStageValue({
        [StageForInfrastructure]: "some value",
      })
    ).toBeFalsy();

    expect(
      StageAwareValue.isStageForInfrastructureValue({
        [Stage.CODE]: "some value for CODE",
        [Stage.PROD]: "some value for PROD",
      })
    ).toBeFalsy();

    expect(
      StageAwareValue.isStageForInfrastructureValue({
        [StageForInfrastructure]: "some value",
      })
    ).toBeTruthy();
  });
});
