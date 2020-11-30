#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
pushd $DIR

nvm_available() {
  type -t nvm > /dev/null
}

source_nvm() {
  if ! nvm_available; then
    [ -e "/usr/local/opt/nvm/nvm.sh" ] && source /usr/local/opt/nvm/nvm.sh
  fi
  if ! nvm_available; then
    [ -e "$HOME/.nvm/nvm.sh" ] && source $HOME/.nvm/nvm.sh
  fi
}

(
  # select a version of node
  source_nvm
  nvm install
  nvm use

  npm i
  npm run build
  npm run test
  npm run lint
)

popd
