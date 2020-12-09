#!/usr/bin/env bash

set -e

if npm whoami &>/dev/null; then
  npm run release
else
  echo "You are not logged into npm!"
  echo "  Run 'npm login' first!"
fi
