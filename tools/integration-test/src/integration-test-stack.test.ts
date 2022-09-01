import libraryInfo from '@guardian/cdk/lib/constants/library-info';
import { App } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { IntegrationTestStack } from "./integration-test-stack";

describe("The Cdk stack", () => {
  it("matches the snapshot", () => {
    const app = new App();

    // Note, we disable metadata here as mocking parts of the the @guardian/cdk
    // dependency to stabilise the snapshot is tricky here.
    const stack = new IntegrationTestStack(app, "cdk", { stack: "integration-test", stage: "PROD", withoutMetadata: true,});
    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
  });
});
