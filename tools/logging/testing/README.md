# Manual testing

These scripts run the ECS logging sidecar locally without deploying to AWS. Prefer the automated
Go test for routine validation; this workflow is useful when inspecting Fluent Bit output interactively.

## Prerequisites

- A running Docker daemon
- Go

## Run the container

From this directory, start the container:

```sh
./start-container.sh
```

The script builds the image, publishes its Fluent Bit forward input on port `24224`, and sets the test-only output plugin to `stdout`.

In a second terminal, send a test record:

```sh
./send-message.sh
```

Pass an argument to change the message value:

```sh
./send-message.sh "hello from local testing"
```

The first terminal should print the transformed record, including the configured application and ECS metadata.
It may also report a failure to send to AWS because the local container has no Kinesis credentials; that
failure is expected for this test. Stop the container with `Ctrl-C` when finished.

## Test output

The logging configuration includes an additional output controlled by `OUTPUT_PLUGIN`:

```
[OUTPUT]
    Name ${OUTPUT_PLUGIN}
    Match *
```

The image defaults this value to `null`, so the additional output is discarded in production. `start-container.sh` changes it to `stdout` so transformed records are visible locally.
