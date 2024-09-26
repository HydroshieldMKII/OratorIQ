#!/bin/bash

# sed -i 's/\r$//' ./install.sh
# sed -i 's/\r$//' ./scripts/_nodeinstall.sh
# sed -i 's/\r$//' ./scripts/_deepspeechinstall.sh

# !> For Debian-based systems only <!
#This script will try to install the required packages for the oratorIQ project

set -e #Stop the script if any command fails
set -x # Print the commands being executed (debug)

#Execute the script with sudo
chmod +x scripts/_nodeinstaller.sh
chmod +x scripts/_whisperinstaller.sh

sudo scripts/_nodeinstall.sh
sudo scripts/_deepspeechinstall.sh

echo "All required packages for the project have been installed successfully."
