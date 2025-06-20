from sqlalchemy import Column, Integer, String, DateTime
from .database import Base
from datetime import datetime

class AudioFile(Base):
    __tablename__ = "audio_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    transcription = Column(String, nullable=True)
    language = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    questions = Column(String, nullable=True)
    word_count = Column(Integer, default=0)
