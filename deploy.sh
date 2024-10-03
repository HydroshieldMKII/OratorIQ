#!/bin/bash

export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

mkdir -p $HOME/oratorIQ
mkdir -p $HOME/oratorIQ/uploads

cp -r app/* $HOME/oratorIQ

cd $HOME/oratorIQ
npm install
