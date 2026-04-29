"""
AI Pipeline Routes
Endpoints for AI-powered virtual try-on and image analysis.
"""

import logging
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import base64

# Import the try-on service
from services.tryon import (
    process_tryon,
    TryOnError
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["AI Pipeline"])

# Pydantic models for request/response
class TryOnRequest(BaseModel):
    """Request model for try-on endpoint."""
    user_image: str  # Base64 encoded image
    clothing_image: str  # Base64 encoded image
    garment_description: Optional[str] = "a clothing item"  # Description of the garment
    hf_token: Optional[str] = None  # Optional HuggingFace token


class TryOnResponse(BaseModel):
    """Response model for try-on endpoint."""
    status: str  # "success" or "error"
    generated_image: Optional[str] = None  # Base64 encoded result
    message: Optional[str] = None
    error_code: Optional[str] = None


# Constants
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
TRYON_TIMEOUT = 120  # 2 minutes
TRYON_MAX_RETRIES = 2


def validate_base64_image(base64_string: str, max_size: int = MAX_IMAGE_SIZE) -> bool:
    """
    Validate a base64 encoded image.
    
    Args:
        base64_string: Base64 encoded image string
        max_size: Maximum allowed size in bytes
    
    Returns:
        True if valid, False otherwise
    """
    try:
        if not base64_string:
            logger.error("Validation: Empty base64 string")
            return False
            
        original_length = len(base64_string)
        
        # Remove data URI prefix if present
        if "," in base64_string:
            base64_string = base64_string.split(",", 1)[1]
            logger.debug(f"Stripped data URI prefix, new length: {len(base64_string)}")
        
        # Check size
        if len(base64_string) > max_size:
            logger.error(f"Validation failed: Image too large: {len(base64_string)} > {max_size} bytes")
            return False
        
        # Try to decode
        decoded = base64.b64decode(base64_string, validate=True)
        logger.debug(f"Base64 validation passed. Original: {original_length}, Decoded: {len(decoded)} bytes")
        return True
    except Exception as e:
        logger.error(f"Base64 validation failed: {str(e)}")
        return False


@router.post("/tryon", response_model=TryOnResponse)
async def virtual_tryon(request: TryOnRequest) -> TryOnResponse:
    """
    Generate a virtual try-on image using IDM-VTON.
    
    Takes a user photo and clothing image, and generates a photorealistic image
    of the user wearing the clothing using the IDM-VTON Hugging Face Space.
    
    Args:
        request: TryOnRequest with user_image and clothing_image (both base64)
    
    Returns:
        TryOnResponse with generated_image (base64) or error details
    """
    try:
        logger.info(f"Received try-on request - user_image length: {len(request.user_image) if request.user_image else 0}, clothing_image length: {len(request.clothing_image) if request.clothing_image else 0}")
        
        # Validate inputs
        if not request.user_image:
            logger.error("Validation failed: user_image is required")
            raise HTTPException(status_code=400, detail="user_image is required")
        if not request.clothing_image:
            logger.error("Validation failed: clothing_image is required")
            raise HTTPException(status_code=400, detail="clothing_image is required")
        
        # Validate image formats
        logger.info("Validating user_image format...")
        if not validate_base64_image(request.user_image):
            logger.error("Validation failed: Invalid or too large user_image")
            raise HTTPException(status_code=400, detail="Invalid or too large user_image (must be valid base64, max 5MB)")
        
        logger.info("Validating clothing_image format...")
        if not validate_base64_image(request.clothing_image):
            logger.error("Validation failed: Invalid or too large clothing_image")
            raise HTTPException(status_code=400, detail="Invalid or too large clothing_image (must be valid base64, max 5MB)")
        
        logger.info("All validations passed. Starting virtual try-on process...")
        
        # Get HF token from request or environment
        hf_token = request.hf_token or os.getenv("HF_TOKEN_1")
        if hf_token:
            logger.info(f"Using HF token: {hf_token[:10]}...")
        else:
            logger.info("No primary HF token provided - using public Space or multi-token fallback")
        
        # Get garment description
        garment_desc = request.garment_description or "a clothing item"
        logger.info(f"Garment description: {garment_desc}")
        
        # Call the try-on service (uses multi-token HF logic)
        generated_image = process_tryon(
            user_image_base64=request.user_image,
            clothing_image_base64=request.clothing_image,
            garment_description=garment_desc
        )
        
        logger.info("Try-on completed successfully")
        
        return TryOnResponse(
            status="success",
            generated_image=generated_image,
            message="Try-on image generated successfully"
        )
    
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    
    except TryOnError as e:
        logger.error(f"Try-on error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Try-on error: {str(e)}"
        )
    
    except Exception as e:
        logger.error(f"Unexpected error in try-on endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again."
        )


@router.post("/tryon/upload", response_model=TryOnResponse)
async def virtual_tryon_upload(
    user_image: UploadFile = File(...),
    clothing_image: UploadFile = File(...)
) -> TryOnResponse:
    """
    Generate a virtual try-on image from file uploads.
    
    Alternative endpoint that accepts file uploads instead of base64.
    
    Args:
        user_image: Uploaded user image file
        clothing_image: Uploaded clothing image file
    
    Returns:
        TryOnResponse with generated_image or error details
    """
    try:
        # Read uploaded files
        user_image_data = await user_image.read()
        clothing_image_data = await clothing_image.read()
        
        # Check file sizes
        if len(user_image_data) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail="user_image file too large (max 5MB)")
        if len(clothing_image_data) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail="clothing_image file too large (max 5MB)")
        
        # Convert to base64
        user_image_b64 = base64.b64encode(user_image_data).decode("utf-8")
        clothing_image_b64 = base64.b64encode(clothing_image_data).decode("utf-8")
        
        # Create request and call main endpoint
        request = TryOnRequest(
            user_image=user_image_b64,
            clothing_image=clothing_image_b64
        )
        
        return await virtual_tryon(request)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in file upload endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="File processing error")
