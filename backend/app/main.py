from fastapi import FastAPI, UploadFile, File, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, crud
from .transcription import process_audio
from .database import engine, SessionLocal
import shutil
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="OratorV2 Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/upload", response_model=schemas.AudioFile)
def upload_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    filepath = os.path.join(UPLOAD_DIR, file.filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    audio = crud.create_audio_file(db, filename=file.filename)
    background_tasks.add_task(process_audio, db, audio.id, filepath)
    return audio

@app.get("/files", response_model=list[schemas.AudioFile])
def list_files(db: Session = Depends(get_db)):
    return crud.list_audio_files(db)
  
@app.get("/files/{audio_id}", response_model=schemas.AudioFile)
def get_file(audio_id: int, db: Session = Depends(get_db)):
    audio = crud.get_audio_file(db, audio_id)
    if not audio:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    return audio

@app.get("/status")
def get_status():
    """Get system status including LLM availability"""
    from .analytics import check_ollama_status
    
    return {
        "status": "running",
        "llm_available": check_ollama_status(),
        "ollama_url": os.getenv('OLLAMA_URL', 'http://localhost:11434')
    }
