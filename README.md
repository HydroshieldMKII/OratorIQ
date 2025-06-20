# OratorV2

This project provides a proof-of-concept lecture transcription system. It
contains a FastAPI backend for uploading audio files and a React frontend for
interacting with the API. Uploaded audio is transcribed and a brief summary with
sample questions is stored for later review.

## Quick start

1. Build and run the services using Docker Compose:

```bash
docker-compose up --build
```

2. Open `http://localhost:3000` to access the frontend UI.
