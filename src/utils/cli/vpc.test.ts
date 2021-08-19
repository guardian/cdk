import { primaryVpcSsmParameterPaths, vpcSsmParameterPaths } from "./vpc";

describe("VPC utils", () => {
  test("Identification of primary VPC SSM parameter paths", () => {
    expect(primaryVpcSsmParameterPaths).toEqual([
      "/account/vpc/primary/id",
      "/account/vpc/primary/subnets/private",
      "/account/vpc/primary/subnets/public",
    ]);
  });

  test("VPC SSM parameter path regex patterns", () => {
    expect(vpcSsmParameterPaths).toEqual([
      new RegExp("^/account/vpc/([A-z0-9.-_])+/id$"),
      new RegExp("^/account/vpc/([A-z0-9.-_])+/subnets/private$"),
      new RegExp("^/account/vpc/([A-z0-9.-_])+/subnets/public$"),
    ]);
  });
});
