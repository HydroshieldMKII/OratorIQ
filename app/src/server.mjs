import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import fileUpload from 'express-fileupload';
import whisper from 'nodejs-whisper';
import { NlpManager } from 'node-nlp';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (for HTML)
app.use(fileUpload());  // For handling file uploads
app.use(express.json()); // To parse JSON bodies

// Whisper and NLP options
const whisperOption = {
    outputInText: false,
    outputInVtt: false,
    outputInSrt: false,
    outputInCsv: false,
    translateToEnglish: false,
    language: 'fr',
    timestamps_length: false,
    wordTimestamps: false,
    splitOnWord: false
}

const options = {
    modelName: 'small',  // Whisper model to use
    autoDownloadModelName: 'small',
    whisperOptions: whisperOption,
    withCuda: false,    // Set to true if CUDA is available
    verbose: true,
    removeWavFileAfterTranscription: true  // Remove file after processing
};

// NLP Manager initialization (assuming French language)
const manager = new NlpManager({ languages: ['fr'], nlu: { useNoneFeature: false } });

// Transcribe audio
async function transcribeAudio(filePath) {
    try {
        let text = await whisper.nodewhisper(filePath, options);
        return text.replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]\s{3}/g, '');
    } catch (error) {
        console.error(`Error during transcription: ${error.message}`);
        return null;
    }
}

// Analyze text and count questions
async function analyzeQuestions(corpus) {
    //Format corpus on one line
    corpus = corpus.replace(/\n/g, ' ');
    const sentences = corpus.split(/(?<=[.!?])\s+/);

    // Count the number of questions
    let questions = []
    let questionCount = 0;

    //check if the sentence is a question
    for (const sentence of sentences) {
        const response = await manager.process('fr', sentence);
        if (response.intent === 'question') {
            const questionData = { sentence: sentence, sentiment: response.sentiment }
            questions.push(questionData);
            questionCount++;
        }
    }

    return {
        questions: questions,
        questionCount: questionCount
    };
}

app.post('/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        console.log("No file uploaded");
        return res.status(400).send('No files were uploaded.');
    }

    const audioFile = req.files.audio;
    const uploadPath = path.join(__dirname, 'uploads', audioFile.name);

    // Save the file to the uploads directory
    audioFile.mv(uploadPath, async function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }

        const corpus = await transcribeAudio(uploadPath);

        if (!corpus) {
            console.error("Error transcribing audio, no corpus generated");
            return res.status(500).send('Error transcribing audio.');
        }

        const questionAnalysis = await analyzeQuestions(corpus);

        // Delete the uploaded file after processing
        fs.unlinkSync(uploadPath);

        res.json({
            transcribedText: corpus,
            questionAnalysis: questionAnalysis,
        });
    });
});

app.post('/ask', async (req, res) => {
    // Ask a question based on the latest corpus (implementation needed)
});

app.put('/train', async (req, res) => {
    // Train NLP model (implementation needed)
});

app.put('/model/add', async (req, res) => {
    // Add whisper model (implementation needed)
});

// Define questions patterns
const questionPatterns = [
    { pattern: 'quoi', response: 'Quelle est la question?' },
    { pattern: 'qui', response: 'Qui est demandé?' },
    { pattern: 'où', response: 'Où cela se passe-t-il?' },
    { pattern: 'quand', response: 'Quand cela se produit-il?' },
    { pattern: 'pourquoi', response: 'Pourquoi est-ce important?' },
    { pattern: 'comment', response: 'Comment cela fonctionne-t-il?' },
    { pattern: 'est-ce que', response: 'Est-ce que c’est une question?' },
    { pattern: 'n’est-ce pas', response: 'N’est-ce pas une question?' },
    { pattern: 'avez-vous', response: 'Avez-vous une question?' },
    { pattern: 'pouvez-vous', response: 'Pouvez-vous me dire?' },
    { pattern: 'qu’est-ce que', response: 'Qu’est-ce que cela signifie?' },
    { pattern: 'quel', response: 'Quel est votre avis?' }
];

// Adding training data for questions
async function addQuestionTrainingData() {
    for (const { pattern } of questionPatterns) {
        await manager.addDocument('fr', `${pattern}*`, 'question');
    }
    await manager.train();
}

// Initialize training data
await addQuestionTrainingData()

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Host forwarded to http://localhost:3030`);
});
