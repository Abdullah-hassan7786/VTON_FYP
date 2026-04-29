from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64
import logging
import os
from dotenv import load_dotenv

# Load environment variables from .env and .env.local
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '.env.local'), override=True)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="Rizz-Up Virtual Try-On API", version="1.0.0")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register route routers
from routes.ai_pipeline import router as ai_pipeline_router
app.include_router(ai_pipeline_router)

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "message": "API is running"}

@app.post("/api/images/crop")
async def crop_image(image: UploadFile = File(...)):
    """
    Crop the uploaded image using the local logic from skin_analysis.py.
    """
    try:
        from services.skin_analysis import crop_to_face, encode_to_base64_jpeg
        contents = await image.read()
        image_array = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image_array is None:
            raise HTTPException(status_code=400, detail="Invalid image format")

        cropped = crop_to_face(image_array)
        cropped_base64 = encode_to_base64_jpeg(cropped)

        return JSONResponse({
            "cropped_image": cropped_base64,
            "face_detected": True
        })

    except Exception as e:
        logger.error(f"Error cropping image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/images/analyze")
async def analyze_image(request: dict):
    """
    Perform skin tone analysis using the local logic from skin_analysis.py.
    """
    try:
        base64_image = request.get("base64Image")
        if not base64_image:
            raise HTTPException(status_code=400, detail="No image provided")

        from services.skin_analysis import decode_base64_image, extract_skin_tone, classify_skin, map_to_season, SEASONS_DB
        
        b64_clean = base64_image.split(",")[1] if "," in base64_image else base64_image
        img = decode_base64_image(b64_clean)
        
        b, g, r = extract_skin_tone(img)
        info = classify_skin(b, g, r)
        season = map_to_season(info)
        data = SEASONS_DB[season]
        
        return JSONResponse({
            "season": season,
            "characteristics": data["characteristics"],
            "colorsToSuggest": data["suggest"],
            "reasonToSuggest": data["reason_suggest"],
            "colorsToAvoid": data["avoid"],
            "reasonToAvoid": data["reason_avoid"],
            "content": data["content"],
            "undertone": info["undertone"],
            "lightness": info["lightness"]
        })

    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
