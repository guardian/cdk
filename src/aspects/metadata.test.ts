/* eslint-disable @typescript-eslint/no-unsafe-assignment -- test deals with template JSON */
/* eslint-disable @typescript-eslint/no-unsafe-member-access -- test deals with template JSON */

import { suite, test } from "node:test";
import { Aspects, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import type { BucketProps } from "aws-cdk-lib/aws-s3";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { simpleGuStackForTesting } from "../utils/test";
import { Metadata } from "./metadata";

class GuExampleConstruct extends Bucket {
  // eslint-disable-next-line custom-rules/valid-constructors -- explicitly do not want to couple to GuStack as that already registers this aspect
  constructor(scope: Stack, id: string, props: BucketProps) {
    super(scope, id, {
      ...props,
    });
  }
}

class NotGuExampleConstruct extends Bucket {
  // eslint-disable-next-line custom-rules/valid-constructors -- explicitly do not want to couple to GuStack as that already registers this aspect
  constructor(scope: Stack, id: string, props: BucketProps) {
    super(scope, id, {
      ...props,
    });
  }
}

suite("Metadata aspect", () => {
  test("should include a list of Guardian constructs", (t) => {
    const stack = new Stack();
    new GuExampleConstruct(stack, "some-id", {});
    new NotGuExampleConstruct(stack, "some-other-id", {});

    Aspects.of(stack).add(new Metadata(stack));

    const constructs = Template.fromStack(stack).toJSON().Metadata["gu:cdk:constructs"];
    t.assert.deepEqual(constructs, ["GuExampleConstruct"]);
  });

  test("should include the Guardian CDK version", (t) => {
    const stack = simpleGuStackForTesting();

    Aspects.of(stack).add(new Metadata(stack));

    const version = Template.fromStack(stack).toJSON().Metadata["gu:cdk:version"];
    t.assert.equal(version !== undefined, true);
  });
});
