export interface GuAsgCapacity {
  /**
   * The number of EC2 instances running under normal circumstances,
   * i.e. when there are no deployment or scaling events in progress.
   */
  minimumInstances: number;

  /**
   * The maximum number of EC2 instances.
   * If omitted, this will be set to `minimumInstances * 2`.
   * This allows us to support Riff-Raff's autoscaling deployment type by default.
   *
   * Should only be set if you need to scale beyond the default limit (e.g. due to heavy traffic),
   * or restrict scaling for a specific reason.
   *
   * Note: If `minimumInstances` is defined with a Mapping `maximumInstances` must also be defined as a Mapping.
   */
  maximumInstances?: number;
}
