# ECS logging sidecar

This directory contains the Fluent Bit configuration for the logging sidecar used by GuCDK ECS deployments, and the
tests for it. The sidecar runs the stock [AWS for Fluent Bit](https://github.com/aws/aws-for-fluent-bit) init image
with Guardian configuration for shipping ECS application logs to Central ELK through Kinesis. There is no
Guardian-built image.

The configuration parses structured application logs and enriches each record with application and ECS metadata,
including stack, stage, app, repository, task name, ECS cluster, task ARN, and task definition.

## Usage

GuCDK configures the sidecar as a FireLens log router for ECS services created by `GuLoadBalancedAppExperimental`.
Applications using that pattern do not need to configure it directly.

The container has a read-only root filesystem and a writable volume mounted at `/tmp`. GuCDK passes the Guardian
config to it in the `GU_FLUENT_BIT_PARSERS` and `GU_FLUENT_BIT_CONFIG` environment variables. A command override writes
them to `/tmp/guardian/` and then runs the image's own entrypoint. The init process loads them through the
`aws_fluent_bit_init_file_N` variables, alongside the `/ecs/ecs-metadata.conf` file provided by the image. Because
`/init` is not writable, it writes its generated config to `/tmp/init/`.

The sidecar receives application identity from the construct and ECS metadata from the init process. Its production
output is configured by the FireLens log driver in GuCDK.

## Configuration

The sidecar's image, command, environment variables and Fluent Bit configuration are defined once, in
[`src/experimental/patterns/logging-sidecar.ts`](../../src/experimental/patterns/logging-sidecar.ts). Change them there.

The tests in this directory read them from `config/sidecar.json`, which is generated from that file and ignored by git.
To regenerate it, run this from the repository root:

```sh
script/generate-logging-sidecar
```

`test.sh` and `testing/start-container.sh` regenerate it automatically.

To upgrade AWS for Fluent Bit, update the image tag and its multi-architecture index digest, which you can get with
`docker buildx imagetools inspect public.ecr.aws/aws-observability/aws-for-fluent-bit:<tag>`.

## Testing

The automated test uses [Testcontainers](https://testcontainers.com/) to start the sidecar as GuCDK configures it, sends
records using the Fluent Bit forward protocol, and verifies the transformed output. It requires Go, Node.js with the
repository's npm dependencies installed, and a running Docker daemon.

From this directory, run:

```sh
./test.sh
```

See [Manual testing](./testing/README.md) for an interactive local workflow.

## Further reading

- [Amazon ECS FireLens custom configuration example](https://github.com/aws-samples/amazon-ecs-firelens-examples/tree/mainline/examples/fluent-bit/config-file-type-file)
- [AWS for Fluent Bit multi-config initialization](https://github.com/aws/aws-for-fluent-bit/blob/mainline/use_cases/init-process-for-fluent-bit/README.md#how-to-use-multi-config-feature)
