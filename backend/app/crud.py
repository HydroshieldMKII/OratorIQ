from sqlalchemy.orm import Session
from . import models, schemas

def create_audio_file(db: Session, filename: str) -> models.AudioFile:
    db_obj = models.AudioFile(filename=filename)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def list_audio_files(db: Session):
    return db.query(models.AudioFile).all()
  
def get_audio_file(db: Session, audio_id: int):
    return db.query(models.AudioFile).filter(models.AudioFile.id == audio_id).first()

def update_analysis(db: Session, audio_id: int, *, transcription: str, summary: str, questions: str):
    obj = get_audio_file(db, audio_id)
    if obj:
        obj.transcription = transcription
        obj.word_count = len(transcription.split())
        obj.summary = summary
        obj.questions = questions
        db.commit()
        db.refresh(obj)
    return obj
