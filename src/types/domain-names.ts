export interface GuDomainName {
  /**
   * The Fully Qualified Domain Name.
   *
   * @example "riff-raff.gutools.co.uk"
   */
  domainName: string;

  /**
   * Route53 Zone ID.
   *
   * To be provided only if the zone for `domainName` is managed by Route53.
   */
  hostedZoneId?: string;
}
