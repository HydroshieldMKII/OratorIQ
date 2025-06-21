from pydantic import BaseModel
from datetime import datetime

class AudioFileBase(BaseModel):
    filename: str

class AudioFileCreate(AudioFileBase):
    selected_model: str | None = None

class AudioFile(AudioFileBase):
    id: int
    uploaded_at: datetime
    transcription: str | None = None
    language: str | None = None
    summary: str | None = None
    questions: str | None = None
    word_count: int | None = None
    processing_stage: str = "uploading"
    progress_percentage: int = 0
    file_size: int | None = None
    audio_duration: float | None = None
    selected_model: str | None = None

    class Config:
        from_attributes = True
