import type { Stage } from "../constants";

export type GuDomainNameProps = Record<Stage, GuDomainName>;

export interface GuDomainName {
  domainName: string;
  hostedZoneId?: string;
}
