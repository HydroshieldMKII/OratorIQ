#!/bin/bash

#This script will install the required packages for the oratorIQ project

set -e #Stop the script if any command fails

DEBUG=false # Set to true to print commands for debugging

# Node setup
NODE_VERSION=20.17.0

# Whisper setup
WHISPER_MODEL=small # See table below for model name
USE_CUDA=y          # Use CUDA for GPU acceleration (y/n)

# | Model     | Disk   | RAM     |
# |-----------|--------|---------|
# | tiny      |  75 MB | ~390 MB |
# | tiny.en   |  75 MB | ~390 MB |
# | base      | 142 MB | ~500 MB |
# | base.en   | 142 MB | ~500 MB |
# | small     | 466 MB | ~1.0 GB |
# | small.en  | 466 MB | ~1.0 GB |
# | medium    | 1.5 GB | ~2.6 GB |
# | medium.en | 1.5 GB | ~2.6 GB |
# | large-v1  | 2.9 GB | ~4.7 GB |
# | large     | 2.9 GB | ~4.7 GB |

if [ "$DEBUG" = true ]; then
    echo ">>Debug mode enabled"
    set -x
fi

# ------> SYSTEM UPDATE <------
# Disable the needrestart service
sudo sed -i 's/#$nrconf{restart} = '"'"'i'"'"';/$nrconf{restart} = '"'"'a'"'"';/g' /etc/needrestart/needrestart.conf

# Update package lists and upgrade installed packages
sudo apt update && sudo apt upgrade -y

# ------> NODE INSTALLATION <------
sudo apt install -y curl make cmake

# Function to install NVM
install_nvm() {
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
}

# Check if NVM is installed
if ! command -v nvm &>/dev/null; then
    echo ">>Installing NVM..."
    install_nvm
else
    echo ">>NVM is already installed."
fi

# Install Node.js using NVM
nvm install $NODE_VERSION
nvm use $NODE_VERSION

echo ">>Node.js version $NODE_VERSION has been installed."

# Install expect for automated model download
sudo apt install expect -y

echo ">>Installing whisper model..."
expect -c "
    spawn npx --yes nodejs-whisper download
    expect \"[Nodejs-whisper] Enter model name (e.g. 'tiny.en') or 'cancel' to exit
(ENTER for tiny.en):\"
    send \"$WHISPER_MODEL\r\"
    expect \"[Nodejs-whisper] Do you want to use CUDA for compilation? (y/n)
(ENTER for n):\"
    send \"$USE_CUDA\r\"
    expect eof
"

# ------> WHISPER INSTALLATION <------
if ! command -v pip &>/dev/null; then
    echo ">>pip could not be found. Installing..."
    sudo apt install -y python3-pip
fi

# Install virtualenv if not already installed
if ! command -v virtualenv &>/dev/null; then
    echo ">>virtualenv could not be found. Installing..."
    pip install virtualenv
fi

# Create and activate virtual environment
echo ">>Creating and activating virtual environment..."
sudo apt install -y python3.10-venv make
python3 -m venv whisper_env
source whisper_env/bin/activate

# Prepare Whisper install
echo ">>Preparing Whisper..."
pip install setuptools-rust
sudo apt install -y python3-dev build-essential ffmpeg

# Install Whisper
echo ">>Installing Whisper..."
pip install -U openai-whisper

echo ">>Whisper installation completed."
echo ">>Project installation complete!"
echo ">>Important: to manually use Whisper in the CLI, run 'source whisper_env/bin/activate' in the project folder to load the python env."
