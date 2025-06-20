import os
import logging
import traceback
from .analytics import simple_summary, generate_questions, check_ollama_status, ensure_model_available, wait_for_model_ready
from . import crud
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def transcribe_file(path: str) -> str:
    """Transcribe audio file using Whisper AI"""
    try:
        # Check if file exists
        if not os.path.exists(path):
            logger.error(f"Audio file not found: {path}")
            return f"[Error: File not found - {os.path.basename(path)}]"
        
        # Check if file is empty
        if os.path.getsize(path) == 0:
            logger.error(f"Audio file is empty: {path}")
            return f"[Error: Empty file - {os.path.basename(path)}]"
        
        logger.info(f"Starting transcription of {path}")
        import whisper
        
        # Load model
        model = whisper.load_model("base")
        logger.info("Whisper model loaded successfully")
        
        # Transcribe
        result = model.transcribe(path)
        text = result.get("text", "").strip()
        
        if text:
            logger.info(f"Transcription successful. Length: {len(text)} characters")
            return text
        else:
            logger.warning(f"Transcription returned empty text for {path}")
            return f"[No speech detected in {os.path.basename(path)}]"
            
    except ImportError as e:
        logger.error(f"Whisper not installed: {e}")
        return f"[Error: Whisper AI not available - {os.path.basename(path)}]"
    except Exception as e:
        logger.error(f"Transcription failed for {path}: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        print(f"TRANSCRIPTION ERROR: {str(e)}")
        print(f"FULL TRACEBACK: {traceback.format_exc()}")
        return f"[Error: Transcription failed - {str(e)}]"

def process_audio(db: Session, audio_id: int, path: str):
    """Process audio file: transcribe and generate analytics"""
    try:
        logger.info(f"Processing audio file {path} for audio_id {audio_id}")
        
        # Check Ollama status and ensure model is available
        if check_ollama_status():
            logger.info("Ollama service is available")
            if ensure_model_available():
                logger.info("Model is available, waiting for it to be ready...")
                if not wait_for_model_ready():
                    logger.warning("Model not ready for inference, will use fallback methods")
            else:
                logger.warning("Could not ensure model availability, will use fallback methods")
        else:
            logger.warning("Ollama service not available, will use fallback methods")
        
        # Transcribe the audio
        text = transcribe_file(path)
        logger.info(f"Transcription completed: {len(text)} characters")
        
        # Generate analytics using LLM
        summary = simple_summary(text)
        logger.info(f"Generated summary: {summary}")
        questions_list = generate_questions(text)
        logger.info(f"Generated questions: {questions_list}")
        questions = '\n '.join(questions_list) if questions_list else "No questions generated"
        
        # Update database
        result = crud.update_analysis(
            db, 
            audio_id, 
            transcription=text, 
            summary=summary, 
            questions=questions
        )
        
        if result:
            logger.info(f"Successfully processed audio_id {audio_id}")
        else:
            logger.error(f"Failed to update database for audio_id {audio_id}")
            
    except Exception as e:
        logger.error(f"Error processing audio {audio_id}: {str(e)}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        print(f"PROCESSING ERROR: {str(e)}")
        print(f"FULL TRACEBACK: {traceback.format_exc()}")
        # Still try to update the database with error info
        crud.update_analysis(
            db, 
            audio_id, 
            transcription=f"[Processing error: {str(e)}]", 
            summary="Error occurred during processing", 
            questions="Unable to generate questions due to processing error"
        )
