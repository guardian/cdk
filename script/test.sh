#!/usr/bin/env bash

set -e

# only install dependencies when running in CI (currently GitHub Actions)
# see https://docs.github.com/en/free-pro-team@latest/actions/reference/environment-variables#default-environment-variables
if [ $CI ] ; then
  npm ci
fi

npm run test
