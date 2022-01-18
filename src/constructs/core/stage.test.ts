import "@aws-cdk/assert/jest";

import "../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { App, CfnMapping } from "@aws-cdk/core";
import { GuStack } from "./stack";
import type { Stage } from "./stage";
import { GuCertificateExample, NewStageMapping } from "./stage";

describe("Stage refactor (POC)", () => {
  it("should output a mapping as expected", () => {
    const stack = new GuStack(new App(), "Test", { stack: "test" });

    const mappings = NewStageMapping(new CfnMapping(stack, "foo"));
    const domainName = mappings.set("domainName", stack.stage as Stage, {
      CODE: "foo.example.com",
      PROD: "prod.example.com",
    });

    new GuCertificateExample(stack, {
      app: "foo",
      domainName: domainName,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ignore
    const json = SynthUtils.toCloudFormation(stack);

    console.log(JSON.stringify(json, null, 4));

    /** Yields...

    {
        "Parameters": {
            "Stage": {
                "Type": "String",
                "Default": "CODE",
                "AllowedValues": [
                    "CODE",
                    "PROD"
                ],
                "Description": "Stage name"
            }
        },
        "Mappings": {
            "foo": {
                "CODE": {
                    "domainName": "foo.example.com"
                },
                "PROD": {
                    "domainName": "prod.example.com"
                }
            }
        },
        "Resources": {
            "CertificateFoo8CD0D22E": {
                "Type": "AWS::CertificateManager::Certificate",
                "Properties": {
                    "DomainName": {
                        "Fn::FindInMap": [
                            "foo",
                            {
                                "Ref": "Stage"
                            },
                            "domainName"
                        ]
                    },
                    "Tags": [
                        {
                            "Key": "App",
                            "Value": "foo"
                        },
                        {
                            "Key": "gu:cdk:version",
                            "Value": "TEST"
                        },
                        {
                            "Key": "gu:repo",
                            "Value": "guardian/cdk"
                        },
                        {
                            "Key": "Stack",
                            "Value": "test"
                        },
                        {
                            "Key": "Stage",
                            "Value": {
                                "Ref": "Stage"
                            }
                        }
                    ],
                    "ValidationMethod": "DNS"
                },
                "UpdateReplacePolicy": "Retain",
                "DeletionPolicy": "Retain"
            }
        }
    }

     */
  });
});
