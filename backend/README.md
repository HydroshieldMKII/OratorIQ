# OratorV2 Backend

This service provides audio upload and transcription endpoints using FastAPI.
After uploading, files are transcribed using a Whisper-based pipeline. Basic
analytics such as summaries and question suggestions are generated using
self-hosted Transformer models and stored in the database.

## Development

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Uploaded files are stored in the `uploads/` directory and recorded in a SQLite database `app.db`.
