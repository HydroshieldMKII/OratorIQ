#!/bin/bash

set -e # Stop the script if any command fails
set -x # Print the commands being executed (debug)

# Update package list and install required packages
sudo apt-get update
sudo apt-get install ffmpeg -y
