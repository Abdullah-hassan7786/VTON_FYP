
import os
import logging
import base64
import json
import time
import requests
from typing import Dict, Any
from openai import OpenAI
import google.genai as genai
from google.genai import types

logger = logging.getLogger(__name__)

class TryOnError(Exception):
    """Base exception for Try-On service."""
    pass

def call_gemini_fallback_vton(user_image_path: str, clothing_image_path: str, garment_description: str) -> str:
    """
    Fallback: Uses Gemini 1.5 Flash (Free Tier) + Pollinations.ai (Free Image Gen).
    Works when Grok credits are exhausted.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise TryOnError("Gemini fallback failed: GEMINI_API_KEY not found")
        
    logger.info("Using Gemini 1.5 Flash + Pollinations.ai fallback...")
    
    try:
        client_gemini = genai.Client(api_key=api_key)
        
        # Prepare images for Gemini
        def get_image_data(path):
            with open(path, "rb") as f:
                return types.Part.from_bytes(data=f.read(), mime_type="image/jpeg")
        
        user_part = get_image_data(user_image_path)
        garm_part = get_image_data(clothing_image_path)
        
        prompt = f"""
        CRITICAL TASK: You are a Forensic Image Analyst and Expert AI Prompt Engineer.
        The goal is a "Virtual Try-On" where IDENTITY PRESERVATION is the absolute #1 priority.
        
        Analyze these two images deeply:
        IMAGE 1: A photo of a specific human (Source Identity).
        IMAGE 2: A photo of a piece of clothing ({garment_description}).
        
        Generate a dense, descriptive prompt for a photorealistic AI image generator that will recreate the person from Image 1 wearing the clothing from Image 2.
        
        IDENTITY DESCRIPTION (MANDATORY):
        - Describe the person's face shape, eye color, eye shape, eyebrows, nose structure, lip fullness, and any distinct facial features.
        - Describe their hair style, texture, and color.
        - Describe their skin tone precisely.
        - Describe their body type and height.
        
        GARMENT INTEGRATION:
        - Describe the EXACT clothing from Image 2 being worn by the person.
        - Detail fabric, color, patterns, and drape.
        
        ENVIRONMENT & QUALITY:
        - Professional high-fashion studio photography, 8k, photorealistic.
        
        OUTPUT FORMAT:
        - Return ONLY the prompt paragraph.
        """
        
        response = client_gemini.models.generate_content(
            model="gemini-2.0-flash",
            contents=[prompt, user_part, garm_part]
        )
        generation_prompt = response.text.strip()
        
        # Clean up any potential AI prefixing
        for prefix in ["Prompt:", "Output:", "Description:"]:
            if generation_prompt.startswith(prefix):
                generation_prompt = generation_prompt[len(prefix):].strip()
        
        logger.info(f"Gemini forensic prompt generated (len: {len(generation_prompt)})")
        
        # Use Pollinations.ai with maximum quality parameters
        import urllib.parse
        # Append quality boosters and identity enforcement keywords
        quality_boosters = "photorealistic, hyper-realistic, highly detailed, 8k, masterpiece, sharp focus, professional photography, identity-preserved face"
        enhanced_prompt = f"{generation_prompt}, {quality_boosters}"
        
        encoded_prompt = urllib.parse.quote(enhanced_prompt)
        image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&enhance=true&model=flux&seed={int(time.time())}"

        
        logger.info(f"Fetching result image from Pollinations.ai...")
        img_response = requests.get(image_url, timeout=60)
        
        if img_response.status_code == 200:
            return base64.b64encode(img_response.content).decode("utf-8")
        else:
            raise Exception(f"Pollinations API failed with status {img_response.status_code}")

    except Exception as e:
        logger.error(f"Gemini fallback failed: {str(e)}")
        raise TryOnError(f"All Try-On services failed. Grok (No Credits) & Gemini Error: {str(e)}")

from gradio_client import Client, handle_file

def call_gradio_vton(user_image_path: str, clothing_image_path: str, garment_description: str) -> str:
    """
    Uses specialized Hugging Face Spaces for high-quality Virtual Try-On.
    Tries multiple HF tokens and fallback spaces if GPU limits are reached.
    """
    # Collect all available HF tokens
    hf_tokens = []
    for i in range(1, 5):
        t = os.getenv(f"HF_TOKEN_{i}")
        if t:
            hf_tokens.append(t)
    
    # Fallback if no tokens are found at all
    if not hf_tokens:
        logger.warning("No HF_TOKENs found. Falling back to Gemini...")
        return call_gemini_fallback_vton(user_image_path, clothing_image_path, garment_description)
        
    # List of spaces to try in order of reliability/quality
    spaces = [
        {"name": "yisol/IDM-VTON", "api": "/tryon"},
        {"name": "sm4ll-VTON/sm4ll-VTON-Demo", "api": "/generate"}
    ]
    
    for space in spaces:
        for token_idx, hf_token in enumerate(hf_tokens):
            try:
                logger.info(f"Attempting {space['name']} with token {token_idx + 1}...")
                client = Client(space['name'], token=hf_token)
                
                if space['name'] == "yisol/IDM-VTON":
                    # IDM-VTON specific parameters
                    job = client.submit(
                        dict={"background": handle_file(user_image_path), "layers": [], "composite": None},
                        garm_img=handle_file(clothing_image_path),
                        garment_des=garment_description,
                        is_checked=True,
                        is_checked_crop=False,
                        denoise_steps=30,
                        seed=42,
                        api_name="/tryon"
                    )
                    result = job.result(timeout=300) # Wait up to 5 minutes
                    result_path = result[0] if isinstance(result, (list, tuple)) else result
                else:
                    # sm4ll-VTON specific parameters
                    workflow = "top"
                    desc_lower = garment_description.lower()
                    if any(w in desc_lower for w in ["dress", "skirt", "gown"]): workflow = "dress"
                    elif any(w in desc_lower for w in ["shoe", "footwear"]): workflow = "footwear"
                    elif any(w in desc_lower for w in ["glass", "eyewear"]): workflow = "eyewear"
                    
                    try:
                        job = client.submit(
                            base_img=handle_file(user_image_path),
                            garment_img=handle_file(clothing_image_path),
                            workflow_choice=workflow,
                            mask_img=None,
                            api_name="/generate"
                        )
                        result = job.result(timeout=300)
                    except Exception as inner_e:
                        if "invalid api key" in str(inner_e).lower():
                            logger.info(f"Retrying {space['name']} without token due to API key error...")
                            client_no_token = Client(space['name'])
                            job = client_no_token.submit(
                                base_img=handle_file(user_image_path),
                                garment_img=handle_file(clothing_image_path),
                                workflow_choice=workflow,
                                mask_img=None,
                                api_name="/generate"
                            )
                            result = job.result(timeout=300)
                        else:
                            raise inner_e
                    
                    result_path = result["path"] if isinstance(result, dict) else result

                if result_path and os.path.exists(result_path):
                    with open(result_path, "rb") as f:
                        logger.info(f"Successfully generated image using {space['name']} and token {token_idx + 1}")
                        return base64.b64encode(f.read()).decode("utf-8")

            except Exception as e:
                error_msg = str(e).lower()
                logger.warning(f"Space {space['name']} with token {token_idx + 1} failed: {error_msg}")
                
                # Detect GPU limit or 503 error to trigger token switch
                if any(kw in error_msg for kw in ["gpu", "limit", "queue full", "503", "unavailable", "rate limit"]):
                    logger.info(f"GPU/Rate limit detected for token {token_idx + 1}. Jumping to next token...")
                    continue # Try next token
                else:
                    # If it's a different kind of error, maybe try the next token anyway or move to next space
                    continue

    # Final fallback to Gemini + Pollinations
    logger.info("All Gradio spaces and tokens failed. Falling back to Gemini + Pollinations...")
    return call_gemini_fallback_vton(user_image_path, clothing_image_path, garment_description)




def process_tryon(user_image_base64: str, clothing_image_base64: str, garment_description: str) -> str:
    """
    Main entry point for try-on processing.
    """
    import tempfile
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as user_tmp:
        user_tmp.write(base64.b64decode(user_image_base64.split(",")[1] if "," in user_image_base64 else user_image_base64))
        user_path = user_tmp.name
        
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as garm_tmp:
        garm_tmp.write(base64.b64decode(clothing_image_base64.split(",")[1] if "," in clothing_image_base64 else clothing_image_base64))
        garm_path = garm_tmp.name
        
    try:
        result = call_gradio_vton(user_path, garm_path, garment_description)
        return result
    finally:
        for p in [user_path, garm_path]:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except:
                pass
