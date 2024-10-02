import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import whisper from 'nodejs-whisper';
import { NlpManager } from 'node-nlp';
import fs from 'fs';

const app = express();
const port = 3000;

// Middleware
app.use(express.static('src/public')); // Serve static files (for HTML)
app.use(fileUpload());  // For handling file uploads
app.use(express.json()); // To parse JSON bodies

// Whisper and NLP options
const options = {
    modelName: 'small',  // Whisper model to use
    withCuda: false,    // Set to true if CUDA is available
    verbose: true,
    removeWavFileAfterTranscription: true  // Remove file after processing
};

// NLP Manager initialization (assuming French language)
const manager = new NlpManager({ languages: ['fr'], nlu: { useNoneFeature: false } });

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
    console.log('Training data for Questions patterns...');
    await manager.train();
}

// Transcribe audio
async function transcribeAudio(filePath) {
    try {
        let text = await whisper.nodewhisper(filePath, options);
        // Clean text by removing timestamps ( [00:08:29.500 --> 00:08:36.500] )
        return text.replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]/g, '');
    } catch (error) {
        console.error(`Error during transcription: ${error.message}`);
        return null;
    }
}

// Analyze text and count questions
async function analyzeText(corpus) {
    //split corpus into sentences with \n
    const sentences = corpus.split('\n');
    console.log(`Sentences: ${sentences}`);
    sentences.forEach(sentence => {
        manager.process('fr', sentence);
    });

    // Count the number of questions
    let questionCount = 0;

    //check if the sentence is a question
    for (const sentence of sentences) {
        const response = await manager.process('fr', sentence);
        if (response.intent === 'question') {
            console.log(`Question found: ${sentence}`);
            questionCount++;
        }
    }

    return {
        sentiment: response.sentiment,
        questionCount: questionCount,
    };
}

// New route to handle custom questions
app.post('/ask', async (req, res) => {
    const { question } = req.body; // Get the custom question from the request body

    if (!question) {
        return res.status(400).send('No question provided.');
    }

    // Assuming corpus is the last processed transcript
    const corpus = await getLatestCorpus(); // Implement this function to retrieve the latest corpus

    // Process the custom question with the NLP manager
    const response = await manager.process('fr', question);

    // Check if the question can be answered based on the corpus
    const answer = await generateAnswerBasedOnCorpus(corpus, question); // Await here

    res.json({
        question: question,
        answer: answer,
        sentiment: response.sentiment
    });
});

// Function to generate an answer based on the corpus and a custom question
async function generateAnswerBasedOnCorpus(corpus, question) {
    const keywords = await extractKeywords(question);
    const answers = [];

    console.log(`Keywords extracted from the question: ${keywords}`);

    keywords.forEach(keyword => {
        if (corpus.includes(keyword)) {
            answers.push(`The corpus mentions ${keywords.join(' ')}.`);
        }
    });

    // If no keywords found, return a default response
    return answers.length > 0 ? answers.join(' ') : 'I cannot find the answer to your question.';
}

// Function to extract keywords from the question 
async function extractKeywords(question) {
    return question.toLowerCase().match(/\b\w+\b/g) || []; // Extract words as keywords
}

// Function to retrieve the latest corpus
let latestCorpus = '';
async function getLatestCorpus() {
    return latestCorpus;
}

app.post('/upload', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        console.log("No file uploaded");
        return res.status(400).send('No files were uploaded.');
    }

    const audioFile = req.files.audio;
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const uploadPath = path.join(__dirname, 'uploads', audioFile.name);

    // Save the file to the uploads directory
    audioFile.mv(uploadPath, async function (err) {
        if (err) {
            console.error(err);
            return res.status(500).send(err);
        }

        // Transcribe the audio
        console.log(`Transcribing audio file: ${uploadPath}`);
        const corpus = await transcribeAudio(uploadPath);

        if (!corpus) {
            console.error("Error transcribing audio");
            return res.status(500).send('Error transcribing audio.');
        }

        // Analyze the transcribed text
        const analysis = await analyzeText(corpus);

        // Store the latest corpus globally
        latestCorpus = corpus;

        // Delete the uploaded file after processing
        fs.unlinkSync(uploadPath);

        // Send the analysis back as a response
        res.json({
            transcribedText: corpus,
            analysis: analysis,
        });
    });
});

app.put('/train', async (req, res) => {
    // Train NLP model (implementation needed)
});

app.put('/model/add', async (req, res) => {
    // Add whisper model (implementation needed)
});

// Initialize training data
await addQuestionTrainingData()

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Host forwarded to http://localhost:3030`);
});
