#!/bin/bash

# Script to install Node.js using NVM on Ubuntu without sudo

# Function to install NVM
install_nvm() {
    echo "Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
}

# Check if NVM is installed
if ! command -v nvm &> /dev/null
then
    install_nvm
else
    echo "NVM is already installed."
fi

# Ask user for the Node.js version to install
#read -p "Enter the Node.js version you want to install (e.g., 14.17.0): " node_version

# Install Node.js using NVM
#nvm install $node_version
#nvm use $node_version
nvm install 20.17.0
nvm use 20.17.0

echo "Node.js version $node_version has been installed."
