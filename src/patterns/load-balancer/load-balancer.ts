import {
  GuApplicationLoadBalancer,
  GuApplicationTargetGroup,
  GuHttpsApplicationListener
} from "../../constructs/loadbalancing";
import {AccessScope, NAMED_SSM_PARAMETER_PATHS} from "../../constants";
import {AppIdentity, GuStack, GuStringParameter} from "../../constructs/core";
import {Bucket} from "aws-cdk-lib/aws-s3";
import {
  ApplicationProtocol,
  IApplicationLoadBalancerTarget,
  ListenerAction
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {GuHttpsEgressSecurityGroup, GuSecurityGroup, GuVpc, SubnetType} from "../../constructs/ec2";
import {GuAlb5xxPercentageAlarm, GuUnhealthyInstancesAlarm, NoMonitoring} from "../../constructs/cloudwatch";
import {StringParameter} from "aws-cdk-lib/aws-ssm";
import {GuLambdaFunction} from "../../constructs/lambda";
import {Architecture, Runtime} from "aws-cdk-lib/aws-lambda";
import {Effect, PolicyStatement} from "aws-cdk-lib/aws-iam";
import {
  ProviderAttribute,
  UserPool,
  UserPoolClientIdentityProvider,
  UserPoolIdentityProviderGoogle
} from "aws-cdk-lib/aws-cognito";
import crypto from "crypto";
import {Duration, SecretValue} from "aws-cdk-lib";
import {AuthenticateCognitoAction} from "aws-cdk-lib/aws-elasticloadbalancingv2-actions";
import {IPeer, ISubnet, IVpc, Port} from "aws-cdk-lib/aws-ec2";
import {AppAccess, GuDomainName} from "../../types";
import {HealthCheck as ALBHealthCheck} from "aws-cdk-lib/aws-elasticloadbalancingv2/lib/shared/base-target-group";
import {AccessLoggingProps, Alarms} from "../ec2-app";
import {GuCertificate} from "../../constructs/acm";

function restrictedCidrRanges(ranges: IPeer[]) {
  return ranges.map((range) => ({
    range,
    port: Port.tcp(443),
    description: `Allow access on port 443 from ${range.uniqueId}`,
  }));
}

export interface GuLoadBalancingComponentsProps extends AppIdentity {
  /**
   * Network access restrictions for your load balancer.
   *
   * Note, this merely provides defence in depth; you should, for example, limit
   * access to the VPN and then treat that as sufficient. Instead, use Google
   * Auth for human access, or a suitable machine auth mechanism.
   */
  access: AppAccess;
  /**
   * The port your application runs on.
   */
  applicationPort?: number;
  /**
   * Enable and configure alarms.
   */
  monitoringConfiguration: Alarms | NoMonitoring;
  /**
   * Enable and configures access logs.
   */
  accessLogging?: AccessLoggingProps;
  /**
   * Specify certificate for the load balancer.
   */
  certificateProps?: GuDomainName;
  /**
   * Specify the VPC to use.
   *
   * @see https://github.com/guardian/aws-account-setup
   */
  vpc?: IVpc;
  /**
   * Specify private subnets if using a non-default VPC or (generally
   * discouraged) to limit to a subset of the available subnets.
   */
  privateSubnets?: ISubnet[];

  /**
   * Specify private subnets if using a non-default VPC or (generally
   * discouraged) to limit to a subset of the available subnets.
   */
  publicSubnets?: ISubnet[];

  protocol?: ApplicationProtocol

  /**
   * Configure Google Auth.
   */
  googleAuth?: {
    /**
     * Enables Google Auth (via Cognito). **Additional MANUAL steps required -
     * see below.**
     *
     * Limits access to members of the allowed Google groups.
     *
     * Note, this does not currently support simultaneous machine access, so
     * only set to true if you only require staff access to your service, or are
     * supporting machine access in some other way.
     *
     * MANUAL STEPS: to get this to work, we need a Google Project and
     * associated credentials. Full instructions can be found here:
     *
     * https://docs.google.com/document/d/1_k1FSE52AZHXufWLTiKTI3xy5cGpziyHazSHTKrYfco/edit?usp=sharing
     *
     * DevX hope to automate this process in the near future.
     */
    enabled: true;
    /**
     * The domain users will access your service.
     *
     * Set this to the same as for certificateProps.
     */
    domain: string;
    /**
     * Groups used for membership checks.
     *
     * If specified, cannot be empty. Users must be a member of at least one
     * group to gain access.
     *
     * WARNING: groups must be specified with the `guardian.co.uk` domain, even
     * if that is the non-idiomatic choice for daily use.
     *
     * @defaultValue [`engineering@guardian.co.uk`]
     */
    allowedGroups?: string[];
    /**
     * The number of minutes before the session expires.
     *
     * Set this value to a safe period of time that revoked users
     * sessions will continue to function.
     *
     * NOTE: This value cannot be larger than 60 minutes.
     *
     * @defaultValue 15
     */
    sessionTimeoutInMinutes?: number;
    /**
     * Secrets Manager path containing Google OAuth2 Client credentials.
     *
     * NOTE: you do not need to set this value, but you DO need to generate and
     * store the associated credentials in Secrets Manager.
     *
     * Credentials should be stored in Secrets Manager as JSON:
     *
     * ```json
     * {
     *   "clientId": "my-client-id",
     *   "clientSecret": "my-client-secret"
     * }
     * ```
     *
     * @see `googleAuth.enabled` for how to generate.
     *
     * @defaultValue /:STAGE/:stack/:app/google-auth-credentials
     */
    credentialsSecretsManagerPath?: string;
  };

  /**
   * Specify custom healthcheck
   */
  healthcheck?: ALBHealthCheck;
}

interface GuLoadBalancingComponentPropsTarget extends GuLoadBalancingComponentsProps {
  target: IApplicationLoadBalancerTarget;
}

export class GuLoadBalancingComponents {
  public readonly certificate?: GuCertificate;
  public readonly loadBalancer: GuApplicationLoadBalancer;
  public readonly listener: GuHttpsApplicationListener;
  public readonly targetGroup: GuApplicationTargetGroup;

  constructor(scope: GuStack, props: GuLoadBalancingComponentPropsTarget) {
    const {
      access,
      accessLogging = { enabled: false },
      app,
      applicationPort,
      certificateProps,
      monitoringConfiguration,
      target,
      vpc = GuVpc.fromIdParameter(scope, AppIdentity.suffixText({ app }, "VPC")),
      privateSubnets = GuVpc.subnetsFromParameter(scope, { type: SubnetType.PRIVATE, app }),
      publicSubnets = GuVpc.subnetsFromParameter(scope, { type: SubnetType.PUBLIC, app }),
    } = props;

    const certificate =
      typeof certificateProps !== "undefined"
        ? new GuCertificate(scope, {
          app,
          domainName: certificateProps.domainName,
          hostedZoneId: certificateProps.hostedZoneId,
        })
        : undefined;

    const loadBalancer = new GuApplicationLoadBalancer(scope, "LoadBalancer", {
      app,
      vpc,
      // Setting internetFacing to true does not necessarily allow public access to the load balancer itself. That is handled by the listener's `open` prop.
      internetFacing: props.access.scope !== AccessScope.INTERNAL,
      vpcSubnets: {
        subnets: props.access.scope === AccessScope.INTERNAL ? privateSubnets : publicSubnets,
      },
    });

    if (accessLogging.enabled) {
      const accessLoggingBucket = new GuStringParameter(scope, "AccessLoggingBucket", {
        description: NAMED_SSM_PARAMETER_PATHS.AccessLoggingBucket.description,
        default: NAMED_SSM_PARAMETER_PATHS.AccessLoggingBucket.path,
        fromSSM: true,
      });

      loadBalancer.logAccessLogs(
        Bucket.fromBucketName(
          scope,
          AppIdentity.suffixText(props, "AccessLoggingBucket"),
          accessLoggingBucket.valueAsString
        ),
        accessLogging.prefix
      );
    }

    const targetGroup = new GuApplicationTargetGroup(scope, "TargetGroup", {
      app,
      vpc,
      protocol: props.protocol,
      targets: [target],
      port: applicationPort,
      healthCheck: props.healthcheck,
    });

    const listener = new GuHttpsApplicationListener(scope, "Listener", {
      app,
      loadBalancer,
      certificate,
      targetGroup,
      // When open=true, AWS will create a security group which allows all inbound traffic over HTTPS
      open: access.scope === AccessScope.PUBLIC && typeof certificate !== "undefined",
    });

    // Since AWS won't create a security group automatically when open=false, we need to add our own
    if (access.scope !== AccessScope.PUBLIC) {
      loadBalancer.addSecurityGroup(
        new GuSecurityGroup(scope, `${access.scope}IngressSecurityGroup`, {
          app,
          vpc,
          description: "Allow restricted ingress from CIDR ranges",
          allowAllOutbound: false,
          ingresses: restrictedCidrRanges(access.cidrRanges),
        })
      );
    }

    if (!monitoringConfiguration.noMonitoring) {
      const {http5xxAlarm, snsTopicName, unhealthyInstancesAlarm} = monitoringConfiguration;

      if (http5xxAlarm) {
        new GuAlb5xxPercentageAlarm(scope, {
          app,
          loadBalancer,
          snsTopicName,
          ...http5xxAlarm,
        });
      }
      if (unhealthyInstancesAlarm) {
        new GuUnhealthyInstancesAlarm(scope, {
          app,
          targetGroup,
          snsTopicName,
        });
      }
    }

    if (props.googleAuth?.enabled) {
      const prefix = `/${scope.stage}/${scope.stack}/${app}`;

      const {
        allowedGroups = ["engineering@guardian.co.uk"],
        sessionTimeoutInMinutes = 15,
        credentialsSecretsManagerPath = `${prefix}/google-auth-credentials`,
      } = props.googleAuth;

      if (sessionTimeoutInMinutes > 60) {
        throw new Error("googleAuth.sessionTimeoutInMinutes must be <= 60!");
      }

      if (allowedGroups.length < 1) {
        throw new Error("googleAuth.allowedGroups cannot be empty!");
      }

      if (allowedGroups.find((group) => !group.endsWith("@guardian.co.uk"))) {
        throw new Error("googleAuth.allowedGroups must use the @guardian.co.uk domain.");
      }

      const deployToolsAccountId = StringParameter.fromStringParameterName(
        scope,
        "deploy-tools-account-id-parameter",
        NAMED_SSM_PARAMETER_PATHS.DeployToolsAccountId.path
      );

      // See https://github.com/guardian/cognito-auth-lambdas for the source
      // code here. ARN format is:
      // arn:aws:lambda:aws-region:acct-id:function:helloworld.
      const gatekeeperFunctionArn = `arn:aws:lambda:eu-west-1:${deployToolsAccountId.stringValue}:function:deploy-PROD-gatekeeper-lambda`;

      // Note, handler and filename must match here:
      // https://github.com/guardian/cognito-auth-lambdas.
      const authLambda = new GuLambdaFunction(scope, "auth-lambda", {
        app: app,
        memorySize: 128,
        handler: "bootstrap",
        runtime: Runtime.PROVIDED_AL2,
        fileName: "deploy/INFRA/cognito-lambda/devx-cognito-lambda-amd64-v2.zip",
        withoutFilePrefix: true,
        withoutArtifactUpload: true,
        bucketNamePath: NAMED_SSM_PARAMETER_PATHS.OrganisationDistributionBucket.path,
        architecture: Architecture.X86_64,
        environment: {
          ALLOWED_GROUPS: allowedGroups.join(","),
          GATEKEEPER_FUNCTION_ARN: gatekeeperFunctionArn,
        },
      });

      authLambda.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["lambda:InvokeFunction"],
          resources: [gatekeeperFunctionArn],
        })
      );

      // Cognito user pool. We require both lambdas: pre-sign-up runs the first
      // time a user attempts to authenticate (before they exist in the User
      // Pool); pre-auth runs in subsequent authentication flows.
      const userPool = new UserPool(scope, "user-pool", {
        lambdaTriggers: {
          preAuthentication: authLambda,
          preSignUp: authLambda,
        },
      });

      // These help ensure domain is deterministic but also unique. Key
      // assumption is that app/stack/stage combo are unique within Guardian.
      const domainPrefix = `com-gu-${app.toLowerCase()}-${scope.stage.toLowerCase()}`;
      const suffix = crypto.createHash("md5").update(domainPrefix).digest("hex");

      const userPoolDomain = userPool.addDomain("domain", {
        cognitoDomain: {
          domainPrefix: `${domainPrefix}-${suffix}`,
        },
      });

      const clientId = SecretValue.secretsManager(credentialsSecretsManagerPath, {jsonField: "clientId"});
      const clientSecret = SecretValue.secretsManager(credentialsSecretsManagerPath, {jsonField: "clientSecret"});

      const userPoolIdp = new UserPoolIdentityProviderGoogle(scope, "google-idp", {
        userPool: userPool,
        clientId: clientId.toString(),
        clientSecret: clientSecret.toString(),
        attributeMapping: {
          email: ProviderAttribute.GOOGLE_EMAIL,
          givenName: ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: ProviderAttribute.GOOGLE_FAMILY_NAME,
          profilePicture: ProviderAttribute.GOOGLE_PICTURE,
          custom: {
            name: ProviderAttribute.GOOGLE_NAME,
          },
        },
        scopes: ["openid", "email", "profile"],
      });

      const userPoolClient = userPool.addClient("alb-client", {
        supportedIdentityProviders: [UserPoolClientIdentityProvider.GOOGLE],
        generateSecret: true,
        oAuth: {
          callbackUrls: [`https://${props.googleAuth.domain}/oauth2/idpresponse`],
        },

        // Note: id and access validity token validity cannot be less than one
        // hour (this is the cognito cookie duration). To quickly invalidate
        // credentials, disable the user in Cognito. It might be that we want to
        // parameterise these going forward, but that would require Infosec
        // discussion.
        idTokenValidity: Duration.hours(1),
        accessTokenValidity: Duration.hours(1),
        refreshTokenValidity: Duration.days(7),
      });

      userPoolClient.node.addDependency(userPoolIdp);

      listener.addAction("CognitoAuth", {
        action: new AuthenticateCognitoAction({
          userPool: userPool,
          userPoolClient: userPoolClient,
          userPoolDomain: userPoolDomain,
          next: ListenerAction.forward([targetGroup]),
          sessionTimeout: Duration.minutes(sessionTimeoutInMinutes),
        }),
      });

      // Need to give the ALB outbound access on 443 for the IdP endpoints.
      const idpEgressSecurityGroup = new GuHttpsEgressSecurityGroup(scope, "ldp-access", {
        app,
        vpc,
      });

      loadBalancer.addSecurityGroup(idpEgressSecurityGroup);
    }
    this.loadBalancer = loadBalancer;
    this.listener = listener;
    this.targetGroup = targetGroup;
  }
}
