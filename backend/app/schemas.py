from pydantic import BaseModel
from datetime import datetime

class AudioFileBase(BaseModel):
    filename: str

class AudioFileCreate(AudioFileBase):
    pass

class AudioFile(AudioFileBase):
    id: int
    uploaded_at: datetime
    transcription: str | None = None
    language: str | None = None
    summary: str | None = None
    questions: str | None = None
    word_count: int | None = None

    class Config:
        from_attributes = True
