import whisper from 'nodejs-whisper';

const filePath = "French.wav";
const options = {
    modelName: 'base',  // whisper model to use
    withCuda: false,  // Set to true if you have CUDA available
    verbose: true,  // For more detailed logs
    removeWavFileAfterTranscription: false  // If you don't want to delete the file after processing
};

async function transcribeAudio() {
    try {
        const transcript = await whisper.nodewhisper(filePath, options);
        console.log(transcript);  // Expected output: [{start, end, speech}]
    } catch (error) {
        console.error(`Error during processing: ${error.message}`);
    }
}

transcribeAudio();
