import "@aws-cdk/assert/jest";
import "../../utils/test/jest";
import { SynthUtils } from "@aws-cdk/assert";
import { Stage, StageForInfrastructure } from "../../constants";
import type { SynthedStack } from "../../utils/test";
import { simpleGuStackForTesting, simpleInfraStackForTesting } from "../../utils/test";
import type { GuStaticSiteProps } from "./static-site";
import { GuStaticSite } from "./static-site";

describe("The GuStaticSite pattern", () => {
  const defaultProps: GuStaticSiteProps = {
    app: "my-app",
    domainNameProps: {
      [Stage.CODE]: {
        domainName: "my-app.dev-gutools.co.uk",
      },
      [Stage.PROD]: {
        domainName: "my-app.gutools.co.uk",
      },
    },
  };

  it("should create the correct resources with minimal config", () => {
    const stack = simpleGuStackForTesting();
    new GuStaticSite(stack, "StaticSite", defaultProps);

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::S3::Bucket", /^OriginBucketMyapp.+$/);
    expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Origins: [
          {
            DomainName: {
              "Fn::GetAtt": ["OriginBucketMyapp924B0FC3", "RegionalDomainName"],
            },
            OriginPath: {
              "Fn::Join": [
                "",
                [
                  "/",
                  {
                    Ref: "Stage",
                  },
                  "/my-app",
                ],
              ],
            },
          },
        ],
      },
    });

    expect(stack).toHaveResourceOfTypeAndLogicalId("AWS::CertificateManager::Certificate", /^CertificateMyapp.+$/);
    expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        ViewerCertificate: {
          AcmCertificateArn: {
            Ref: "CertificateMyappA1452439",
          },
          SslSupportMethod: "sni-only",
        },
      },
    });
  });

  it("should throw when attempting to use an ACM ARN with a hardcoded account id", () => {
    const stack = simpleGuStackForTesting();

    expect(() => {
      new GuStaticSite(stack, "StaticSite", {
        ...defaultProps,
        preExistingCertificateArn: {
          [Stage.CODE]: "arn:aws:acm:us-east-1:000000000000:certificate/abcde-01234-fghij-56789",
          [Stage.PROD]: "arn:aws:acm:us-east-1:000000000000:certificate/01234-abcde-56789-fghij",
        },
      });
    }).toThrowError(
      "Account numbers are considered private information and should not be added to VCS. Use the `account` property on `GuStack` instead."
    );
  });

  it("should throw when provided an ACM ARN outside of the us-east-1 region", () => {
    const stack = simpleGuStackForTesting();

    expect(() => {
      new GuStaticSite(stack, "StaticSite", {
        ...defaultProps,
        preExistingCertificateArn: {
          [Stage.CODE]: `arn:aws:acm:eu-west-1:${stack.account}:certificate/abcde-01234-fghij-56789`,
          [Stage.PROD]: `arn:aws:acm:eu-west-1:${stack.account}:certificate/01234-abcde-56789-fghij`,
        },
      });
    }).toThrowError("CloudFront requires ACM certificates from the us-east-1 region.");
  });

  it("should throw when provided an invalid ACM ARN", () => {
    const stack = simpleInfraStackForTesting();

    expect(() => {
      new GuStaticSite(stack, "StaticSite", {
        ...defaultProps,
        preExistingCertificateArn: {
          [StageForInfrastructure]: `arn:aws:acm:us-east-1:${stack.account}:tls/abcde-01234-fghij-56789`,
        },
      });
    }).toThrowError("Invalid ARN for an ACM resource.");
  });

  it("should not create a new ACM certificate when a us-east-1 certificate ARN is provided", () => {
    const stack = simpleGuStackForTesting();
    new GuStaticSite(stack, "StaticSite", {
      ...defaultProps,
      preExistingCertificateArn: {
        [Stage.CODE]: `arn:aws:acm:us-east-1:${stack.account}:certificate/abcde-01234-fghij-56789`,
        [Stage.PROD]: `arn:aws:acm:us-east-1:${stack.account}:certificate/01234-abcde-56789-fghij`,
      },
    });

    expect(stack).not.toHaveResource("AWS::CertificateManager::Certificate");

    expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        ViewerCertificate: {
          AcmCertificateArn: {
            "Fn::Join": [
              "",
              [
                "arn:aws:acm:us-east-1:",
                {
                  Ref: "AWS::AccountId",
                },
                ":certificate/",
                {
                  "Fn::FindInMap": [
                    "myapp",
                    {
                      Ref: "Stage",
                    },
                    "certificateResourceName",
                  ],
                },
              ],
            ],
          },
          SslSupportMethod: "sni-only",
        },
      },
    });

    const { Mappings } = SynthUtils.toCloudFormation(stack) as SynthedStack;

    expect(Mappings).toMatchObject({
      myapp: {
        CODE: {
          certificateResourceName: "abcde-01234-fghij-56789",
          domainName: "my-app.dev-gutools.co.uk",
        },
        PROD: {
          certificateResourceName: "01234-abcde-56789-fghij",
          domainName: "my-app.gutools.co.uk",
        },
      },
    });
  });

  it("should work with a pre-existing bucket", () => {
    const stack = simpleGuStackForTesting();
    new GuStaticSite(stack, "StaticSite", {
      ...defaultProps,
      preExistingOriginBucketName: "i-already-exist",
    });

    expect(stack).not.toHaveResource("AWS::S3::Bucket");
    expect(stack).not.toHaveResource("AWS::S3::BucketPolicy");

    expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        Origins: [
          {
            DomainName: {
              "Fn::Join": [
                "",
                [
                  "i-already-exist.s3.",
                  {
                    Ref: "AWS::Region",
                  },
                  ".",
                  {
                    Ref: "AWS::URLSuffix",
                  },
                ],
              ],
            },
            OriginPath: {
              "Fn::Join": [
                "",
                [
                  "/",
                  {
                    Ref: "Stage",
                  },
                  "/my-app",
                ],
              ],
            },
          },
        ],
      },
    });
  });

  it("should not create a CloudFormation Mapping when used in a GuStackForInfrastructure", () => {
    const stack = simpleGuStackForTesting();
    new GuStaticSite(stack, "StackSite", defaultProps);
    const json = SynthUtils.toCloudFormation(stack) as SynthedStack;
    expect(json.Mappings).toBeDefined();

    const infraStack = simpleInfraStackForTesting();
    new GuStaticSite(infraStack, "StackSite", {
      ...defaultProps,
      domainNameProps: { [StageForInfrastructure]: { domainName: "my-infra-app.gutools.co.uk" } },
    });
    const infraJson = SynthUtils.toCloudFormation(infraStack) as SynthedStack;
    expect(infraJson.Mappings).toBeUndefined();
  });

  it("should be possible to define multiple in a single stack", () => {
    const stack = simpleGuStackForTesting();
    new GuStaticSite(stack, "Site1", defaultProps);
    new GuStaticSite(stack, "Site2", {
      app: "Site2",
      domainNameProps: {
        [Stage.CODE]: {
          domainName: "site2.dev-gutools.co.uk",
        },
        [Stage.PROD]: {
          domainName: "site2.gutools.co.uk",
        },
      },
      preExistingOriginBucketName: "site2-origin",
    });

    expect(stack).toHaveGuTaggedResource("AWS::CloudFront::Distribution", { appIdentity: { app: defaultProps.app } });
    expect(stack).toHaveGuTaggedResource("AWS::CloudFront::Distribution", { appIdentity: { app: "Site2" } });

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
  });

  it("should be possible to opt-out of DNS creation", () => {
    const stack = simpleGuStackForTesting();
    new GuStaticSite(stack, "Site1", { ...defaultProps, withoutDns: true });
    expect(stack).toCountResources("Guardian::DNS::RecordSet", 0);
  });

  it("should be possible to create a deterministic bucket name", () => {
    const stack = simpleGuStackForTesting();
    new GuStaticSite(stack, "Site", { ...defaultProps, bucketName: "my-new-bucket" });
    expect(stack).toHaveResourceLike("AWS::S3::Bucket", {
      BucketName: "my-new-bucket",
    });
  });
});
