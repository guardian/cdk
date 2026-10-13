import { deepStrictEqual } from "node:assert";
import { suite, test } from "node:test";
import { primaryVpcSsmParameterPaths, vpcSsmParameterPaths } from "./vpc";

suite("VPC utils", () => {
  test("Identification of primary VPC SSM parameter paths", () => {
    deepStrictEqual(primaryVpcSsmParameterPaths, [
      "/account/vpc/primary/id",
      "/account/vpc/primary/subnets/private",
      "/account/vpc/primary/subnets/public",
    ]);
  });

  test("VPC SSM parameter path regex patterns", () => {
    deepStrictEqual(vpcSsmParameterPaths, [
      new RegExp("^/account/vpc/([A-z0-9.-_])+/id$"),
      new RegExp("^/account/vpc/([A-z0-9.-_])+/subnets/private$"),
      new RegExp("^/account/vpc/([A-z0-9.-_])+/subnets/public$"),
    ]);
  });
});
