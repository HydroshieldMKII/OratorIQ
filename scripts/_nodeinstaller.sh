#!/bin/bash

set -e # Stop the script if any command fails
set -x # Print the commands being executed (debug)

# Script to install Node.js using NVM on Ubuntu without sudo

# Node version to install (Latest version supported by DeepSpeech is 15.14.0)
node_version=15.14.0

# Update package lists and upgrade installed packages
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl build-essential

# Function to install NVM
install_nvm() {
    echo "Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
}

# Check if NVM is installed
if ! command -v nvm &>/dev/null; then
    install_nvm
else
    echo "NVM is already installed."
fi

# Install Node.js using NVM
nvm install $node_version
nvm use $node_version

echo "Node.js version $node_version has been installed."

# Create project
echo "Creating a new Node.js project..."
mkdir -p $HOME/oratorIQ && cd $HOME/oratorIQ
npm init -y

# Install required Node.js packages
echo "Installing required Node.js packages..."

echo "Installing NLP..."
npm install node-nlp # https://github.com/axa-group/nlp.js

echo "Installing Express..."
npm install express

echo "Node.js project has been created and required packages have been installed."
