# Vagrantfile to provision OratorIQ environment

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  
  config.vm.provider "virtualbox" do |v|
    v.memory = 4096
    v.cpus = 2
  end

  config.vm.provision "shell", inline: <<-SHELL
    set -e

    NODE_VERSION=20.17.0
    WHISPER_MODEL=small
    USE_CUDA=y

    # Update system and install VirtualBox
    sudo apt-get update && sudo apt-get upgrade -y
    sudo apt-get install -y virtualbox virtualbox-ext-pack

    # Disable the needrestart service
    sudo sed -i 's/#$nrconf{restart} = '"'"'i'"'"';/$nrconf{restart} = '"'"'a'"'"';/g' /etc/needrestart/needrestart.conf

    # Curl and make
    sudo apt-get install -y curl make

    # NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"

    # Node.js
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION

    # Set up project directories
    mkdir -p $HOME/oratorIQ && mkdir -p $HOME/oratorIQ/public && mkdir -p $HOME/oratorIQ/uploads
    mv index.html $HOME/oratorIQ/public/index.html && mv server.mjs $HOME/oratorIQ/server.mjs

    # Initialize Node.js project and install packages
    cd $HOME/oratorIQ
    npm init -y
    npm install nodejs-whisper node-nlp express express-fileupload

    # Expect for prompt automation
    sudo apt-get install expect -y

    # Automate Whisper model download
    expect -c "
      spawn npx nodejs-whisper download
      expect \\"Which model would you like to download?\\"
      send \\"$WHISPER_MODEL\\r\\"
      expect \\"Would you like to use CUDA for GPU acceleration?\\"
      send \\"$USE_CUDA\\r\\"
      expect eof
    "

    # Python 3 and required Whisper dependencies
    sudo apt-get install -y python3-pip python3.10-venv python3-dev build-essential ffmpeg
    pip install virtualenv setuptools-rust

    # Python virtual environment and install Whisper
    python3 -m venv whisper_env
    source whisper_env/bin/activate
    pip install -U openai-whisper

    echo "OratorIQ setup complete!"
    echo "To use Whisper manually, run 'source whisper_env/bin/activate' in the project folder."
  SHELL

  config.vm.network "private_network", type: "dhcp" # Networking setup
end
