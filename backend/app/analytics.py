import random
import os
import logging
import time
from typing import List
import requests
import json

logger = logging.getLogger(__name__)

# Get Ollama URL from environment
OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
DEFAULT_MODEL = "sadiq‑bd/llama3.2‑1b‑uncensored" #"krith/meta-llama-3.2-1b-instruct-uncensored" #"smollm" #"sadiq-bd/llama3.2-1b-uncensored"

def call_ollama(prompt: str, model: str = DEFAULT_MODEL) -> str:
    """Call the self-hosted Ollama LLM"""
    try:
        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "top_p": 0.9
                }
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result.get('response', '').strip()
        else:
            logger.error(f"Ollama API error: {response.status_code}")
            return ""
            
    except Exception as e:
        logger.error(f"Error calling Ollama: {e}")
        return ""

def simple_summary(text: str, sentences: int = 2) -> str:
    """Generate a summary using self-hosted LLM with fallback"""
    if not text or text.startswith('['):
        return "No summary available"
    
    # Try LLM first
    prompt = f"""Veuillez fournir un résumé concis du texte suivant en #{sentences} phrases. Ne incluez pas d'autres informations, juste le résumé.

    Texte: {text[:1000]}

    Résumé:"""
    
    llm_summary = call_ollama(prompt)
    
    if llm_summary:
        return llm_summary
    
    # Fallback
    return "No summary available"

def generate_questions(text: str, num: int = 3) -> List[str]:
    """Generate questions using self-hosted LLM with fallback"""
    if not text or text.startswith('['):
        return []
    
    # Try LLM first
    prompt = f"""Basé sur le texte suivant, générez {num} questions réfléchies qui aideraient quelqu'un à comprendre les concepts clés et les idées discutées. Formatez chaque question sur une nouvelle ligne. Aucun autre texte n'est nécessaire, juste les questions.

    Texte: {text[:1000]}

    Questions:"""
    
    llm_response = call_ollama(prompt)
    
    if llm_response:
        # Parse questions from LLM response
        questions = []
        for line in llm_response.split('\n'):
            line = line.strip()
            # Clean up common prefixes
            if line.startswith(('1.', '2.', '3.', '4.', '5.', '-', '*')):
                line = line[2:].strip()
            if line.startswith(('Q:', 'Question:')):
                line = line.split(':', 1)[1].strip()
            
            if line and line.endswith('?'):
                questions.append(line)
                if len(questions) >= num:
                    break
        
        if questions:
            return questions[:num]
    
    # Fallback to simple method
    return ["No questions generated"]

def check_ollama_status() -> bool:
    """Check if Ollama service is available"""
    try:
        response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        return response.status_code == 200
    except:
        return False

def ensure_model_available(model: str = DEFAULT_MODEL) -> bool:
    """Ensure the specified model is pulled and available"""
    max_retries = 3
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            # Check if model exists
            logger.info(f"Checking if model {model} is available (attempt {attempt + 1}/{max_retries})")
            response = requests.get(f"{OLLAMA_URL}/api/tags", timeout=10)
            
            if response.status_code == 200:
                models = response.json().get('models', [])
                model_names = [m.get('name', '') for m in models]
                
                # Check for exact match or partial match
                for model_name in model_names:
                    if model in model_name or model_name.startswith(model):
                        logger.info(f"Model {model} is available as {model_name}")
                        return True
            
            # If model not found and this is the first attempt, try to pull it
            if attempt == 0:
                logger.info(f"Model {model} not found, attempting to pull...")
                try:
                    pull_response = requests.post(
                        f"{OLLAMA_URL}/api/pull",
                        json={"name": model, "stream": False},
                        timeout=600  # 10 minutes for model download
                    )
                    
                    if pull_response.status_code == 200:
                        logger.info(f"Model {model} pull completed successfully")
                        # Wait a bit for the model to be fully loaded
                        time.sleep(3)
                        continue  # Retry checking if model is available
                    else:
                        logger.error(f"Failed to pull model {model}: {pull_response.status_code}")
                except requests.exceptions.Timeout:
                    logger.warning(f"Model pull timed out, will retry checking availability")
                except Exception as e:
                    logger.error(f"Error pulling model {model}: {e}")
            
            # Wait before retrying
            if attempt < max_retries - 1:
                logger.info(f"Waiting {retry_delay} seconds before retry...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                
        except Exception as e:
            logger.error(f"Error checking model availability: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 2
    
    logger.error(f"Model {model} is not available after {max_retries} attempts")
    return False

def wait_for_model_ready(model: str = DEFAULT_MODEL, max_wait_time: int = 60) -> bool:
    """Wait for model to be ready for inference"""
    logger.info(f"Waiting for model {model} to be ready for inference...")
    start_time = time.time()
    
    while time.time() - start_time < max_wait_time:
        try:
            # Test the model with a simple prompt
            test_response = requests.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": "Hello",
                    "stream": False,
                    "options": {"max_tokens": 5}
                },
                timeout=10
            )
            
            if test_response.status_code == 200:
                result = test_response.json()
                if result.get('response'):
                    logger.info(f"Model {model} is ready for inference")
                    return True
            elif test_response.status_code == 404:
                logger.warning(f"Model {model} not found, waiting...")
            else:
                logger.warning(f"Model test failed with status {test_response.status_code}")
                
        except Exception as e:
            logger.warning(f"Model readiness test failed: {e}")
        
        time.sleep(2)
    
    logger.error(f"Model {model} not ready after {max_wait_time} seconds")
    return False
