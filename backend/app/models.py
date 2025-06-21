from sqlalchemy import Column, Integer, String, DateTime, Float, BigInteger
from .database import Base
from datetime import datetime

class AudioFile(Base):
    __tablename__ = "audio_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    transcription = Column(String, nullable=True)
    language = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    questions = Column(String, nullable=True)
    word_count = Column(Integer, default=0)
    
    # New fields for enhanced functionality
    processing_stage = Column(String, default="uploading")  # uploading, downloading_model, transcribing, analyzing, complete, error
    progress_percentage = Column(Integer, default=0)
    file_size = Column(BigInteger, nullable=True)  # File size in bytes
    audio_duration = Column(Float, nullable=True)  # Duration in seconds
    selected_model = Column(String, nullable=True)  # LLM model used for analysis
