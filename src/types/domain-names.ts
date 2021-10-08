import type { Stage } from "../constants";
import type { GuMigratingResource } from "../constructs/core/migrating";

export type GuDomainNameProps = Record<Stage, GuDomainName> & GuMigratingResource;

export interface GuDomainName {
  domainName: string;
  hostedZoneId?: string;
}
