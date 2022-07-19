/* eslint-disable @typescript-eslint/no-unsafe-assignment -- test deals with template JSON */
/* eslint-disable @typescript-eslint/no-unsafe-member-access -- test deals with template JSON */

import { Aspects, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import type { BucketProps } from "aws-cdk-lib/aws-s3";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { simpleGuStackForTesting } from "../utils/test";
import { Metadata } from "./metadata";

class GuExampleConstruct extends Bucket {
  readonly guConstructID = "GuExampleConstruct";

  // eslint-disable-next-line custom-rules/valid-constructors -- explicitly do not want to couple to GuStack as that already registers this aspect
  constructor(scope: Stack, id: string, props: BucketProps) {
    super(scope, id, {
      ...props,
    });
  }
}

describe("Metadata aspect", () => {
  it("should include a list of Guardian constructs", () => {
    const stack = new Stack();
    new GuExampleConstruct(stack, "some-id", {});

    Aspects.of(stack).add(new Metadata(stack));

    const constructs = Template.fromStack(stack).toJSON().Metadata["gu:cdk:constructs"];
    expect(constructs).toEqual(["GuExampleConstruct"]);
  });

  it("should include the Guardian CDK version", () => {
    const stack = simpleGuStackForTesting();

    Aspects.of(stack).add(new Metadata(stack));

    const version = Template.fromStack(stack).toJSON().Metadata["gu:cdk:version"];
    expect(version).toBeDefined();
  });
});
