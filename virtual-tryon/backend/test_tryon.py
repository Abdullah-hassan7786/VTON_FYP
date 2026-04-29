
import os
import base64
import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv('.env')
load_dotenv('.env.local', override=True)

def test_tryon():
    # Simple 1x1 black pixel GIF base64
    dummy_b64 = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
    
    hf_token = os.getenv("HF_TOKEN_1")
    logger.info(f"Using HF_TOKEN_1: {hf_token[:10]}..." if hf_token else "No HF_TOKEN_1 found")
    
    try:
        logger.info("Calling process_tryon via service...")
        # Note: We use dummy images, which might still cause errors in the model itself,
        # but we want to see if the API CALL succeeds.
        from services.tryon import process_tryon
        result = process_tryon(
            user_image_base64=dummy_b64,
            clothing_image_base64=dummy_b64,
            garment_description="a test shirt"
        )
        logger.info("Success!")
        logger.info(f"Result length: {len(result)}")
        logger.info(f"Result starts with: {result[:50]}")
    except Exception as e:
        logger.error(f"Failed: {str(e)}")

if __name__ == "__main__":
    test_tryon()
