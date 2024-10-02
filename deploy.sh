mkdir -p $HOME/oratorIQ

cp -r app/* $HOME/oratorIQ

cd $HOME/oratorIQ/app

npm install

# Install expect for automated model download
sudo apt install expect -y

echo ">>Installing whisper model..."
expect -c "
    spawn npx --yes nodejs-whisper download
    expect \"Which model would you like to download?\"
    send \"$WHISPER_MODEL\r\"
    expect \"Would you like to use CUDA for GPU acceleration?\"
    send \"$USE_CUDA\r\"
    expect eof
"
