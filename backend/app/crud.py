from sqlalchemy.orm import Session
from . import models, schemas

def generate_unique_filename(db: Session, filename: str) -> str:
    """Generate a unique filename by appending a number if the filename already exists"""
    base_filename = filename
    counter = 1
    
    while db.query(models.AudioFile).filter(models.AudioFile.filename == filename).first():
        name, ext = base_filename.rsplit('.', 1) if '.' in base_filename else (base_filename, '')
        filename = f"{name}_{counter}.{ext}" if ext else f"{name}_{counter}"
        counter += 1
    
    return filename

def create_audio_file(db: Session, filename: str, file_size: int = None, selected_model: str = None) -> models.AudioFile:
    # Generate unique filename to avoid duplicates
    unique_filename = generate_unique_filename(db, filename)
    
    db_obj = models.AudioFile(
        filename=unique_filename,
        file_size=file_size,
        selected_model=selected_model,
        processing_stage="uploading",
        progress_percentage=0
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def list_audio_files(db: Session):
    return db.query(models.AudioFile).all()
  
def get_audio_file(db: Session, audio_id: int):
    return db.query(models.AudioFile).filter(models.AudioFile.id == audio_id).first()

def update_progress(db: Session, audio_id: int, stage: str, progress: int):
    """Update processing stage and progress percentage"""
    obj = get_audio_file(db, audio_id)
    if obj:
        obj.processing_stage = stage
        obj.progress_percentage = progress
        db.commit()
        db.refresh(obj)
    return obj

def update_audio_duration(db: Session, audio_id: int, duration: float):
    """Update audio duration after extraction"""
    obj = get_audio_file(db, audio_id)
    if obj:
        obj.audio_duration = duration
        db.commit()
        db.refresh(obj)
    return obj

def update_analysis(db: Session, audio_id: int, *, transcription: str, summary: str, questions: str):
    obj = get_audio_file(db, audio_id)
    if obj:
        obj.transcription = transcription
        obj.word_count = len(transcription.split())
        obj.summary = summary
        obj.questions = questions
        obj.processing_stage = "complete"
        obj.progress_percentage = 100
        db.commit()
        db.refresh(obj)
    return obj

def update_error_state(db: Session, audio_id: int, error_message: str):
    """Update file to error state with message"""
    obj = get_audio_file(db, audio_id)
    if obj:
        obj.processing_stage = "error"
        obj.transcription = f"[Error: {error_message}]"
        obj.summary = "Processing failed"
        obj.questions = "Unable to generate questions due to error"
        db.commit()
        db.refresh(obj)
    return obj

def stop_ollama_process(audio_id: int):
    """Placeholder function to stop Ollama process for a specific file"""
    # Logic to stop Ollama process
    pass

def stop_whisper_process(audio_id: int):
    """Placeholder function to stop Whisper process for a specific file"""
    # Logic to stop Whisper process
    pass

def delete_audio_file(db: Session, audio_id: int):
    """Delete audio file record from the database"""
    obj = get_audio_file(db, audio_id)
    if obj:
        db.delete(obj)
        db.commit()
