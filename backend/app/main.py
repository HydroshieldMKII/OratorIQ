from fastapi import FastAPI, UploadFile, File, Depends, BackgroundTasks, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, crud
from .transcription import process_audio
from .database import engine, SessionLocal
from .analytics import check_ollama_status
import shutil
import os
import logging
import requests

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
def upload_audio(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...), 
    selected_model: str = Form(None),
    db: Session = Depends(get_db)
):
    # Create audio file record first to get unique filename
    audio = crud.create_audio_file(
        db, 
        filename=file.filename, 
        file_size=0,  # Will update after saving
        selected_model=selected_model
    )
    
    # Use the unique filename from the database record
    filepath = os.path.join(UPLOAD_DIR, audio.filename)
    file_size = 0
    
    # Save file with unique filename and get size
    with open(filepath, "wb") as buffer:
        content = file.file.read()
        file_size = len(content)
        buffer.write(content)
    
    # Update the file size in the database
    audio.file_size = file_size
    db.commit()
    db.refresh(audio)
    
    # Start background processing
    background_tasks.add_task(process_audio, db, audio.id, filepath, selected_model)
    return audio

@app.get("/files", response_model=list[schemas.AudioFile])
def list_files(db: Session = Depends(get_db)):
    return crud.list_audio_files(db)
  
@app.get("/files/{audio_id}", response_model=schemas.AudioFile)
def get_file(audio_id: int, db: Session = Depends(get_db)):
    audio = crud.get_audio_file(db, audio_id)
    if not audio:
        raise HTTPException(status_code=404, detail="File not found")
    return audio

@app.get("/models")
def get_available_models():
    """Get list of available Ollama models"""
    try:
        ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
        response = requests.get(f"{ollama_url}/api/tags", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            models = []

            # Fetch models from local Ollama API
            # for model in data.get('models', []):
            #     model_name = model.get('name', '')
            #     if model_name:
            #         # Clean up model name for display
            #         display_name = model_name.split(':')[0]
            #         models.append({
            #             'name': model_name,
            #             'display_name': display_name,
            #             'size': model.get('size', 0)
            #         })
            
            # Always add these default models if not already present
            default_models = [
                {'name': 'vatistasdim/boXai', 'display_name': 'boXai (Default)', 'size': 0},
                {'name': 'krith/meta-llama-3.2-1b-instruct-uncensored', 'display_name': 'Llama 3.2 1B', 'size': 0},
                {'name': 'smollm', 'display_name': 'SmolLM', 'size': 0}
            ]

            existing_names = {m['name'] for m in models}
            for default_model in default_models:
                if default_model['name'] not in existing_names:
                    models.append(default_model)
            
            return {"models": models, "ollama_available": True}
        else:
            # Return default models if Ollama is not available
            return {
                "models": [
                    {'name': 'vatistasdim/boXai', 'display_name': 'boXai (Default)', 'size': 0},
                    {'name': 'krith/meta-llama-3.2-1b-instruct-uncensored', 'display_name': 'Llama 3.2 1B', 'size': 0},
                    {'name': 'smollm', 'display_name': 'SmolLM', 'size': 0}
                ],
                "ollama_available": False
            }
    except Exception as e:
        logger.error(f"Error fetching models: {e}")
        return {
            "models": [
                {'name': 'vatistasdim/boXai', 'display_name': 'boXai (Default)', 'size': 0}
            ],
            "ollama_available": False
        }

@app.get("/files/{audio_id}/progress")
def get_file_progress(audio_id: int, db: Session = Depends(get_db)):
    """Get processing progress for a specific file"""
    audio = crud.get_audio_file(db, audio_id)
    if not audio:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {
        "id": audio.id,
        "processing_stage": audio.processing_stage,
        "progress_percentage": audio.progress_percentage,
        "filename": audio.filename
    }

@app.get("/status")
def get_status():
    """Get system status including LLM availability"""
    from .analytics import check_ollama_status
    
    return {
        "status": "running",
        "llm_available": check_ollama_status(),
        "ollama_url": os.getenv('OLLAMA_URL', 'http://localhost:11434')
    }

@app.delete("/files/{audio_id}")
def delete_file(audio_id: int, db: Session = Depends(get_db)):
    """Delete a file and its associated data"""
    audio = crud.get_audio_file(db, audio_id)
    if not audio:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Stop Ollama and Whisper processes if applicable
    crud.stop_ollama_process(audio_id)
    crud.stop_whisper_process(audio_id)
    
    # Delete the file from the uploads directory
    file_path = os.path.join(UPLOAD_DIR, audio.filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Remove the file record from the database
    crud.delete_audio_file(db, audio_id)
    
    return {"message": "File deleted successfully"}
