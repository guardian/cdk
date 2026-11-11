# Manual testing

These scripts run the ECS logging sidecar locally without deploying to AWS. Prefer the automated
Go test for routine validation; this workflow is useful when inspecting Fluent Bit output interactively.

## Prerequisites

- A running Docker daemon
- Go
- [jq](https://jqlang.org/)
- Node.js, with the repository's npm dependencies installed (`npm install` from the repository root)

## Run the container

From this directory, start the container:

```sh
./start-container.sh
```

The script regenerates `config/sidecar.json` from GuCDK, then runs the stock image with the same command and environment GuCDK uses. It publishes its Fluent Bit forward input on port `24224`, and sets the test-only output plugin to `stdout`.

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

GuCDK sets this value to `null`, so the additional output is discarded in production. `start-container.sh` changes it to `stdout` so transformed records are visible locally.
