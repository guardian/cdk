#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
MESSAGE="${1:-testing}"
go run "$DIR/.." --field log "{\"hello\":\"$MESSAGE\",\"test\":true}"
