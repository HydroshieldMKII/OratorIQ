import os
import logging
import traceback
from .analytics import simple_summary, generate_questions, check_ollama_status, ensure_model_available, wait_for_model_ready
from . import crud
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_audio_duration(path: str) -> float:
    """Extract audio duration using librosa or fallback methods"""
    try:
        import librosa
        duration = librosa.get_duration(path=path)
        return duration
    except ImportError:
        try:
            # Fallback to ffprobe if librosa not available
            import subprocess
            result = subprocess.run([
                'ffprobe', '-v', 'quiet', '-show_entries', 
                'format=duration', '-of', 'csv=p=0', path
            ], capture_output=True, text=True)
            if result.returncode == 0:
                return float(result.stdout.strip())
        except:
            pass
    except Exception as e:
        logger.warning(f"Could not extract duration from {path}: {e}")
    
    # Return 0 if we can't determine duration
    return 0.0

def transcribe_file(path: str, db: Session, audio_id: int) -> str:
    """Transcribe audio file using Whisper AI"""
    try:
        # Update progress - starting transcription
        crud.update_progress(db, audio_id, "transcribing", 25)
        
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
        
        # Load model with GPU support
        model = whisper.load_model("base", device="cuda")
        logger.info("Whisper model loaded successfully with GPU support")
        
        # Update progress - model loaded
        crud.update_progress(db, audio_id, "transcribing", 50)
        
        # Transcribe
        result = model.transcribe(path, fp16=True)
        text = result.get("text", "").strip()
        
        # Update progress - transcription complete
        crud.update_progress(db, audio_id, "transcribing", 75)
        
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

def process_audio(db: Session, audio_id: int, path: str, selected_model: str = None):
    """Process audio file: transcribe and generate analytics with progress tracking"""
    try:
        logger.info(f"Processing audio file {path} for audio_id {audio_id} with model {selected_model}")
        
        # Extract audio duration
        duration = extract_audio_duration(path)
        if duration > 0:
            crud.update_audio_duration(db, audio_id, duration)
        
        # Update progress - starting processing
        crud.update_progress(db, audio_id, "downloading_model", 5)
        
        # Check Ollama status and ensure model is available
        model_to_use = selected_model or "vatistasdim/boXai"
        
        if check_ollama_status():
            logger.info("Ollama service is available")
            crud.update_progress(db, audio_id, "downloading_model", 10)
            
            if ensure_model_available(model_to_use):
                logger.info(f"Model {model_to_use} is available, waiting for it to be ready...")
                crud.update_progress(db, audio_id, "downloading_model", 20)
                
                if not wait_for_model_ready(model_to_use):
                    logger.warning("Model not ready for inference, will use fallback methods")
            else:
                logger.warning("Could not ensure model availability, will use fallback methods")
        else:
            logger.warning("Ollama service not available, will use fallback methods")
        
        # Transcribe the audio
        text = transcribe_file(path, db, audio_id)
        logger.info(f"Transcription completed: {len(text)} characters")
        
        # Update progress - starting analysis
        crud.update_progress(db, audio_id, "analyzing", 80)
        
        # Generate analytics using LLM
        summary = simple_summary(text, model=model_to_use)
        logger.info(f"Generated summary: {summary}")
        
        crud.update_progress(db, audio_id, "analyzing", 90)
        
        # Generate questions
        questions_list = generate_questions(text, model=model_to_use)
        logger.info(f"Generated questions: {questions_list}")

        # Format questions
        questions = '\n'.join([f"{i+1}. {q}" for i, q in enumerate(questions_list)]) if questions_list else "No questions generated"
        
        # Update database with final results
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
        
        # Update to error state
        crud.update_error_state(db, audio_id, str(e))
