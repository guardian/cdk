import type { StageAwareValue } from "./stage";

export interface GuDomainName {
  domainName: string;
  hostedZoneId?: string;
}

export type GuDomainNameProps = StageAwareValue<GuDomainName>;
