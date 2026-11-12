#!/bin/bash
# Runs the logging sidecar as GuCDK configures it on ECS: the stock AWS for Fluent Bit image with a read-only root
# filesystem, a writable /tmp, and the Guardian config passed in as environment variables.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SIDECAR="$ROOT/tools/logging/config/sidecar.json"

"$ROOT/script/generate-logging-sidecar" >/dev/null

ENV_ARGS=()
while IFS= read -r -d '' entry; do ENV_ARGS+=(-e "$entry"); done < <(jq -j '.environment | to_entries[] | "\(.key)=\(.value)\u0000"' "$SIDECAR")

COMMAND=()
while IFS= read -r line; do COMMAND+=("$line"); done < <(jq -r '.command[]' "$SIDECAR")

docker run --rm -i \
    --read-only --tmpfs /tmp \
    "${ENV_ARGS[@]}" \
    -e ECS_CLUSTER=ECS_CLUSTER \
    -e ECS_TASK_ARN=ECS_TASK_ARN \
    -e ECS_TASK_DEFINITION=ECS_TASK_DEFINITION \
    -e STACK=test-stack \
    -e STAGE=DEV \
    -e APP=test-app \
    -e GU_REPO=GU_REPO \
    -e TASK_NAME=TASK_NAME \
    -e OUTPUT_PLUGIN=stdout \
    -p 24224:24224 \
    "$(jq -r '.image' "$SIDECAR")" \
    "${COMMAND[@]}"
