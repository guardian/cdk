#!/bin/bash
# Regenerates the sidecar settings from GuCDK, then runs the logging integration test.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

"$DIR/../../script/generate-logging-sidecar"
cd "$DIR"
go test "$@" ./...
