#!/bin/bash

# sed -i 's/\r$//' ./install.sh
# sed -i 's/\r$//' ./scripts/_nodeinstaller.sh
# sed -i 's/\r$//' ./scripts/_whisperinstaller.sh

# !> For Debian-based systems only <!
#This script will try to install the required packages for the oratorIQ project

set -e #Stop the script if any command fails

DEBUG=false # Set to true to print commands for debugging
NODE_VERSION=15.14.0
USE_CUDA=false

if [ "$DEBUG" = true ]; then
    echo "Debug mode enabled"
    set -x
fi

# Disable the needrestart service to prevent the script from hanging
sudo sed -i 's/#$nrconf{restart} = '"'"'i'"'"';/$nrconf{restart} = '"'"'a'"'"';/g' /etc/needrestart/needrestart.conf

# Update package lists and upgrade installed packages
sudo apt-get update
sudo apt-get upgrade -y

# ------> NODE INSTALLATION <------
sudo apt-get install -y curl

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
nvm install $NODE_VERSION
nvm use $NODE_VERSION

echo "Node.js version $NODE_VERSION has been installed."

# Create project
echo "Creating a new Node.js project..."
mkdir -p $HOME/oratorIQ && cd $HOME/oratorIQ
npm init -y

# Install required Node.js packages
echo "Installing required Node.js packages..."

echo "Installing Whisper binding..."
npm i nodejs-whisper

echo "Installing whisper model..."
npx nodejs-whisper download # Prompted for model download

echo "Installing NLP..."
npm install node-nlp

echo "Installing Express..."
npm install express

echo "Node.js project has been created and required dependancy have been installed."

# ------> WHISPER INSTALLATION <------

if ! command -v pip &>/dev/null; then
    echo "pip could not be found. Installing..."
    sudo apt install -y python3-pip
fi

if ! command -v git &>/dev/null; then
    echo "git could not be found. Installing..."
    sudo apt install -y git
fi

# Install virtualenv if not already installed
if ! command -v virtualenv &>/dev/null; then
    echo "virtualenv could not be found. Installing..."
    pip install virtualenv
fi

# Create and activate virtual environment
echo "Creating and activating virtual environment..."
sudo apt install -y python3.10-venv
python3 -m venv whisper_env
source whisper_env/bin/activate #To access the virtual environment, run 'source whisper_env/bin/activate'.

# Prepare Whisper install
echo "Preparing Whisper..."
pip install setuptools-rust
sudo apt-get install -y python3-dev build-essential ffmpeg

# Install Whisper
echo "Installing Whisper..."
pip install -U openai-whisper

echo "Whisper installation complete."

echo "Project installation complete!"
