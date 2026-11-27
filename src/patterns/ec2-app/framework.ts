/*
These classes don't do anything amazing. Yet!
The plan is to sprinkle some framework specific tooling into them.
 */

import { AccessScope } from "../../constants";
import type { GuStack } from "../../constructs/core";
import type { PlaySecretRotationProps } from "../../constructs/ssm/play-secret-rotation/rotation";
import { PlaySecretRotation } from "../../constructs/ssm/play-secret-rotation/rotation";
import type { GuDomainName } from "../../types";
import type { GuEc2AppProps } from "./base";
import { GuEc2App } from "./base";

/** Settings for automatically rotating the secret read by Play. */
export type { PlaySecretRotationProps } from "../../constructs/ssm/play-secret-rotation/rotation";

type GuEc2FrameworkAppProps = Omit<GuEc2AppProps, "applicationPort"> & { certificateProps: GuDomainName };

type GuEc2WorkerProps = Omit<GuEc2AppProps, "applicationPort" | "access">;

interface PlaySecretRotationOption {
  /** Opt in to scheduled rotation of the existing Parameter Store secret read by Play. */
  readonly playSecretRotation?: PlaySecretRotationProps;
}

/** Configuration for a load-balanced EC2 Play application. */
export type GuPlayAppProps = GuEc2FrameworkAppProps & PlaySecretRotationOption;
/** Configuration for an EC2 Play worker with a health-check-only load balancer. */
export type GuPlayWorkerAppProps = GuEc2WorkerProps & PlaySecretRotationOption;

function configurePlaySecretRotation(scope: GuStack, app: GuEc2App, props: GuPlayAppProps | GuPlayWorkerAppProps) {
  if (!props.playSecretRotation) {
    return;
  }

  const role = app.autoScalingGroup.instanceLaunchTemplate.role;
  if (!role) {
    throw new Error("Play secret rotation requires an EC2 instance role");
  }

  const { monitoringConfiguration, playSecretRotation } = props;
  new PlaySecretRotation(scope, {
    ...playSecretRotation,
    appScope: app,
    snsTopicName:
      playSecretRotation.snsTopicName ??
      (monitoringConfiguration.noMonitoring ? undefined : monitoringConfiguration.snsTopicName),
  }).grantRead(role);
}

/**
 * Creates an instance of [[`GuEc2App`]], with an application port of 9000 and no access to the load balancer.
 * This is useful for applications that only have an LB for health check purposes
 */
export class GuPlayWorkerApp extends GuEc2App {
  static readonly PORT: number = 9000;

  constructor(scope: GuStack, props: GuPlayWorkerAppProps) {
    super(scope, {
      ...props,
      applicationPort: GuPlayWorkerApp.PORT,
      access: { scope: AccessScope.INTERNAL, cidrRanges: [] },
    });
    configurePlaySecretRotation(scope, this, props);
  }
}

/**
 * Creates an instance of [[`GuEc2App`]], with an application port of 9000.
 */
export class GuPlayApp extends GuEc2App {
  static readonly PORT: number = 9000;

  constructor(scope: GuStack, props: GuPlayAppProps) {
    super(scope, { ...props, applicationPort: GuPlayApp.PORT });
    configurePlaySecretRotation(scope, this, props);
  }
}

/**
 * Creates an instance of [[`GuEc2App`]], with an application port of 3000.
 */
export class GuNodeApp extends GuEc2App {
  static readonly PORT: number = 3000;

  constructor(scope: GuStack, props: GuEc2FrameworkAppProps) {
    super(scope, { ...props, applicationPort: GuNodeApp.PORT });
  }
}
