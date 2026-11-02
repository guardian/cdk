# ECS logging sidecar

This directory contains the logging sidecar image used by GuCDK ECS deployments. It extends
[AWS for Fluent Bit](https://github.com/aws/aws-for-fluent-bit) with Guardian configuration for shipping
ECS application logs to Central ELK through Kinesis.

The configuration parses structured application logs and enriches each record with application and ECS metadata,
including stack, stage, app, repository, task name, ECS cluster, task ARN, and task definition.

## Usage

GuCDK configures the image as a FireLens log router for ECS services created by `GuLoadBalancedAppExperimental`.
Applications using that pattern do not need to build or configure this image directly.

The image receives application identity from the construct and ECS metadata from the AWS for Fluent Bit base image.
Its production output is configured by the FireLens log driver in GuCDK.

## Testing

The automated test builds and starts the image with [Testcontainers](https://testcontainers.com/), sends records using
the Fluent Bit forward protocol, and verifies the transformed output. It requires Go and a running Docker daemon.

From this directory, run:

```sh
go test ./...
```

See [Manual testing](./testing/README.md) for an interactive local workflow.

## Further reading

- [Amazon ECS FireLens custom configuration example](https://github.com/aws-samples/amazon-ecs-firelens-examples/tree/mainline/examples/fluent-bit/config-file-type-file)
- [AWS for Fluent Bit multi-config initialization](https://github.com/aws/aws-for-fluent-bit/blob/mainline/use_cases/init-process-for-fluent-bit/README.md#how-to-use-multi-config-feature)
