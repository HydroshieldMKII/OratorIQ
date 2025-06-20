# OratorIQ

Welcome to OratorIQ, a powerful application for Speech-to-Text (STT) and Natural Language Processing (NLP) designed to help and improve classes at the Cegep of Shawinigan.

## Table of Contents

- [Installation](#installation)
  - [Standalone Installer](#standalone-installer)
  - [Vagrant](#vagrant)
- [Speech-to-Text (STT) Framework](#speech-to-text-stt-framework)
- [Natural Language Processing (NLP)](#natural-language-processing-nlp)
- [Backend Framework](#backend-framework)
  - [Packages](#packages)
- [Other Resources](#other-resources)
  - [Machine Learning](#machine-learning)
- [Potential Models](#potential-models)
  - [Hugging Face](#hugging-face-model)

## Installation

### Standalone Installer

- **Linux**: Use our standalone installer bash script.

### Vagrant

- [Vagrant](https://developer.hashicorp.com/vagrant): Simplify your development environment setup.

## Speech-to-Text (STT) Framework

- [Whisper](https://github.com/openai/whisper): A versatile STT framework by OpenAI.

## Natural Language Processing (NLP)

- [NLP.js](https://github.com/axa-group/nlp.js): A comprehensive NLP library.

## Backend Framework

- [Node.js](https://nodejs.org/en): A powerful JavaScript runtime for building scalable network applications.

### Packages

- [Express](https://expressjs.com): Fast, unopinionated, minimalist web framework for Node.js.
- [Nodejs-Whisper](https://www.npmjs.com/package/nodejs-whisper): Node.js bindings for the Whisper STT framework.

## Other Resources

### Machine Learning

- [TensorFlow](https://www.tensorflow.org/learn): An end-to-end open-source platform for machine learning.

## Potential Models

### Hugging Face Model

- [bofenghuang/speech-to-text](https://huggingface.co/spaces/bofenghuang/speech-to-text): Transcribe long-form microphone or audio inputs
- [hf-audio/whisper-large-v3-turbo](https://huggingface.co/spaces/hf-audio/whisper-large-v3-turbo): Transcribe long-form microphone or audio inputs

## Usage

1. Install dependencies:

   ```bash
   cd app
   npm install
   ```

2. Start the server:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:3000` in your browser. Upload an audio file and wait for transcription.
   Use the **Ask a Custom Question** form to query the transcript.
