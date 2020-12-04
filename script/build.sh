#!/usr/bin/env bash

set -e

yarn --frozen-lockfile
yarn build
