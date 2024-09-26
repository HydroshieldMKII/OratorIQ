#!/bin/bash

set -e # Stop the script if any command fails
set -x # Print the commands being executed (debug)

# Update package list
sudo apt update

if ! command -v pip &>/dev/null; then
    echo "pip could not be found. Installing..."
    sudo apt install python3-pip -y
fi

if ! command -v git &>/dev/null; then
    echo "git could not be found. Installing..."
    sudo apt install git -y
fi

# Install virtualenv if not already installed
if ! command -v virtualenv &>/dev/null; then
    echo "virtualenv could not be found. Installing..."
    pip install virtualenv
fi

# Create and activate virtual environment
python3 -m venv whisper_env
source whisper_env/bin/activate

# Prepare Whisper install
pip install setuptools-rust
sudo apt-get install python3-dev build-essential ffmpeg

# Install Whisper
pip install -U openai-whisper

echo "Whisper installation complete. To activate the virtual environment, run 'source whisper_env/bin/activate'."
