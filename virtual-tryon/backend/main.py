from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import base64
import logging

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


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "message": "API is running"}


def center_crop_and_resize(image_array, target_w=400, target_h=500):
    """Center-crop the image to maintain aspect ratio and resize to target."""
    h, w = image_array.shape[:2]
    target_ratio = target_w / target_h
    current_ratio = w / h

    if current_ratio > target_ratio:
        # image too wide -> crop sides
        new_w = int(h * target_ratio)
        start_x = (w - new_w) // 2
        cropped = image_array[:, start_x:start_x + new_w]
    else:
        # image too tall -> crop top/bottom
        new_h = int(w / target_ratio)
        start_y = (h - new_h) // 2
        cropped = image_array[start_y:start_y + new_h, :]

    resized = cv2.resize(cropped, (target_w, target_h))
    return resized


@app.post("/api/images/crop")
async def crop_image(image: UploadFile = File(...)):
    """
    Crop (center) the uploaded image and return a base64 JPEG.
    This endpoint no longer enforces face-detection or multi-face rejection.
    """
    try:
        contents = await image.read()
        image_array = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image_array is None:
            raise HTTPException(status_code=400, detail="Invalid image format")

        # Center crop and resize for consistency
        cropped = center_crop_and_resize(image_array, target_w=400, target_h=500)

        # Encode to JPEG
        _, buffer = cv2.imencode('.jpg', cropped, [cv2.IMWRITE_JPEG_QUALITY, 95])
        cropped_base64 = base64.b64encode(buffer).decode('utf-8')

        logger.info("Image cropped successfully (no face validation).")

        return JSONResponse({
            "cropped_image": cropped_base64,
            "face_detected": None,
            "face_count": None
        })

    except HTTPException as he:
        logger.warning(f"HTTP Exception: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.post("/api/images/analyze")
async def analyze_image(request: dict):
    """
    Analyze skin tone from base64 encoded image. This version does not require explicit
    face detection and will sample the central region of the image for skin tone.
    """
    try:
        base64_image = request.get('base64Image')

        if not base64_image:
            raise HTTPException(status_code=400, detail="base64Image is required")

        # Decode base64 image
        try:
            image_data = base64.b64decode(base64_image)
            image_array = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 image: {str(e)}")

        if image_array is None:
            raise HTTPException(status_code=400, detail="Failed to decode image")

        # Use center region sample for skin tone analysis (robust when face detection is disabled)
        h, w = image_array.shape[:2]
        sample_h = max(10, h // 10)
        sample_w = max(10, w // 10)
        start_y = max(0, (h // 2) - (sample_h // 2))
        start_x = max(0, (w // 2) - (sample_w // 2))
        skin_sample = image_array[start_y:start_y + sample_h, start_x:start_x + sample_w]

        if skin_sample.size == 0:
            raise HTTPException(status_code=400, detail="Image too small for analysis")

        # Calculate average color (BGR -> RGB)
        avg_color_bgr = cv2.mean(skin_sample)[:3]
        avg_color_rgb = (avg_color_bgr[2], avg_color_bgr[1], avg_color_bgr[0])

        # Determine skin tone characteristics using existing helper
        analysis = analyze_skin_tone(avg_color_rgb)

        logger.info(f"Image analyzed successfully (no face validation). Season: {analysis.get('season')}")

        return JSONResponse(analysis)

    except HTTPException as he:
        logger.warning(f"HTTP Exception: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")


def analyze_skin_tone(rgb_color):
    """
    Analyze skin tone and determine season based on RGB values.
    """
    r, g, b = rgb_color

    # Calculate simple saturation and lightness proxies
    max_val = max(r, g, b)
    min_val = min(r, g, b)

    if max_val == 0:
        saturation = 0
        lightness = 0
    else:
        saturation = ((max_val - min_val) / max_val) * 100
        lightness = (max_val / 255) * 100

    # Calculate hue (approximate)
    if max_val == min_val:
        hue = 0
    else:
        if r == max_val:
            hue = (60 * ((g - b) / (max_val - min_val))) % 360
        elif g == max_val:
            hue = (120 + 60 * ((b - r) / (max_val - min_val))) % 360
        else:
            hue = (240 + 60 * ((r - g) / (max_val - min_val))) % 360

    # Determine undertone (warm vs cool)
    undertone = "Warm" if r > b else "Cool"

    # Determine lightness
    if lightness > 60:
        lightness_category = "Light"
    elif lightness > 40:
        lightness_category = "Medium"
    else:
        lightness_category = "Deep"

    # Determine season based on characteristics
    season = determine_season(hue, saturation, lightness, undertone)

    return {
        "season": season,
        "undertone": undertone,
        "lightness": lightness_category,
        "saturation_level": round(saturation, 1),
        "lightness_percentage": round(lightness, 1),
        "characteristics": f"You have a {lightness_category} {undertone} complexion with {season} season color harmony.",
        "colorsToSuggest": get_suggested_colors(season),
        "reasonToSuggest": get_reason_to_suggest(season),
        "colorsToAvoid": get_colors_to_avoid(season),
        "reasonToAvoid": get_reason_to_avoid(season),
        "content": f"Based on your skin analysis, you are a {season} color season. These colors will enhance your natural beauty and complement your skin tone perfectly."
    }


def determine_season(hue, saturation, lightness, undertone):
    """
    Determine the color season based on skin tone characteristics.
    """
    if undertone == "Warm":
        if lightness >= 60:
            if saturation < 30:
                return "Light Spring"
            else:
                return "Warm Spring"
        elif lightness >= 40:
            if saturation < 35:
                return "Soft Autumn"
            else:
                return "Warm Autumn"
        else:
            return "Deep Autumn"
    else:  # Cool undertone
        if lightness >= 60:
            if saturation < 30:
                return "Light Summer"
            else:
                return "Cool Summer"
        elif lightness >= 40:
            if saturation < 35:
                return "Soft Summer"
            else:
                return "Cool Winter"
        else:
            return "Deep Winter"


def get_suggested_colors(season):
    """Get color suggestions for a given season."""
    color_map = {
        "Light Spring": [
            {"name": "Peach", "hex_code": "#FFCC99"},
            {"name": "Warm White", "hex_code": "#FFFACD"},
            {"name": "Light Coral", "hex_code": "#F08080"},
            {"name": "Cream", "hex_code": "#FFFDD0"},
            {"name": "Apricot", "hex_code": "#FBBC04"},
            {"name": "Pale Yellow", "hex_code": "#FFFFE0"},
            {"name": "Soft Pink", "hex_code": "#FFB6C1"},
            {"name": "Champagne", "hex_code": "#F7E7CE"},
            {"name": "Light Gold", "hex_code": "#FFD700"},
            {"name": "Vanilla", "hex_code": "#F3E5AB"},
            {"name": "Blush", "hex_code": "#FFC0CB"},
            {"name": "Ivory", "hex_code": "#FFFFF0"}
        ],
        "Warm Spring": [
            {"name": "Coral", "hex_code": "#FF7F50"},
            {"name": "Warm Orange", "hex_code": "#FF8C00"},
            {"name": "Terracotta", "hex_code": "#E2725B"},
            {"name": "Burnt Orange", "hex_code": "#CC5500"},
            {"name": "Gold", "hex_code": "#FFD700"},
            {"name": "Warm Red", "hex_code": "#DC143C"},
            {"name": "Olive", "hex_code": "#808000"},
            {"name": "Caramel", "hex_code": "#A0522D"},
            {"name": "Warm Brown", "hex_code": "#8B4513"},
            {"name": "Rust", "hex_code": "#B7410E"},
            {"name": "Honey", "hex_code": "#FFBF00"},
            {"name": "Warm Yellow", "hex_code": "#FFE135"}
        ],
        "Bright Spring": [
            {"name": "Bright Red", "hex_code": "#FF0000"},
            {"name": "Clear Yellow", "hex_code": "#FFFF00"},
            {"name": "True Blue", "hex_code": "#0000FF"},
            {"name": "Emerald", "hex_code": "#50C878"},
            {"name": "Hot Pink", "hex_code": "#FF69B4"},
            {"name": "Electric Orange", "hex_code": "#FF6600"},
            {"name": "Bright Green", "hex_code": "#00FF00"},
            {"name": "Clear Turquoise", "hex_code": "#40E0D0"},
            {"name": "Magenta", "hex_code": "#FF00FF"},
            {"name": "Bright Purple", "hex_code": "#9400D3"},
            {"name": "Vivid Pink", "hex_code": "#FF1493"},
            {"name": "Lime", "hex_code": "#00FF00"}
        ],
        "Light Summer": [
            {"name": "Soft Blue", "hex_code": "#87CEEB"},
            {"name": "Mauve", "hex_code": "#E0B0FF"},
            {"name": "Pale Pink", "hex_code": "#FADADD"},
            {"name": "Cool Gray", "hex_code": "#D3D3D3"},
            {"name": "Lavender", "hex_code": "#E6E6FA"},
            {"name": "Soft Violet", "hex_code": "#EE82EE"},
            {"name": "Pale Periwinkle", "hex_code": "#CCCCFF"},
            {"name": "Cool White", "hex_code": "#F0F8FF"},
            {"name": "Powder Blue", "hex_code": "#B0E0E6"},
            {"name": "Pale Rose", "hex_code": "#F64A8A"},
            {"name": "Soft Teal", "hex_code": "#367588"},
            {"name": "Silver", "hex_code": "#C0C0C0"}
        ],
        "Cool Summer": [
            {"name": "Rose", "hex_code": "#FF007F"},
            {"name": "Cool Pink", "hex_code": "#FF1493"},
            {"name": "Cool Red", "hex_code": "#DC143C"},
            {"name": "Berry", "hex_code": "#8F00FF"},
            {"name": "Plum", "hex_code": "#DDA0DD"},
            {"name": "Cool Blue", "hex_code": "#0087BE"},
            {"name": "Teal", "hex_code": "#008080"},
            {"name": "Mauve", "hex_code": "#B19CD9"},
            {"name": "Dusty Rose", "hex_code": "#DCAE96"},
            {"name": "Burgundy", "hex_code": "#800020"},
            {"name": "Cool Purple", "hex_code": "#9933FF"},
            {"name": "Gray-Blue", "hex_code": "#366994"}
        ],
        "Soft Summer": [
            {"name": "Soft Mauve", "hex_code": "#D8A9D8"},
            {"name": "Dusty Blue", "hex_code": "#6A8CAF"},
            {"name": "Muted Rose", "hex_code": "#C97DA7"},
            {"name": "Soft Gray", "hex_code": "#999999"},
            {"name": "Pale Mauve", "hex_code": "#E6D7E6"},
            {"name": "Soft Teal", "hex_code": "#7A9EA0"},
            {"name": "Muted Purple", "hex_code": "#9E7BA2"},
            {"name": "Soft Jade", "hex_code": "#9DC183"},
            {"name": "Dusty Lavender", "hex_code": "#BBAFD4"},
            {"name": "Soft Taupe", "hex_code": "#B38B8B"},
            {"name": "Pale Gray", "hex_code": "#D0D0D0"},
            {"name": "Soft Blue-Gray", "hex_code": "#8B9DC3"}
        ],
        "Light Autumn": [
            {"name": "Warm Beige", "hex_code": "#F5DEB3"},
            {"name": "Terracotta", "hex_code": "#E2725B"},
            {"name": "Warm Brown", "hex_code": "#A0826D"},
            {"name": "Light Olive", "hex_code": "#A4AC86"},
            {"name": "Camel", "hex_code": "#C19A6B"},
            {"name": "Warm Tan", "hex_code": "#D2B48C"},
            {"name": "Rust Orange", "hex_code": "#B7410E"},
            {"name": "Khaki", "hex_code": "#F0E68C"},
            {"name": "Light Rust", "hex_code": "#C85A54"},
            {"name": "Warm Cream", "hex_code": "#FFFDD0"},
            {"name": "Soft Gold", "hex_code": "#FFD700"},
            {"name": "Light Bronze", "hex_code": "#CD7F32"}
        ],
        "Soft Autumn": [
            {"name": "Olive", "hex_code": "#808000"},
            {"name": "Warm Taupe", "hex_code": "#B38B8B"},
            {"name": "Muted Brown", "hex_code": "#8B6914"},
            {"name": "Soft Gold", "hex_code": "#FFAA33"},
            {"name": "Warm Gray", "hex_code": "#A9A9A9"},
            {"name": "Rust", "hex_code": "#B7410E"},
            {"name": "Muted Green", "hex_code": "#6B8E23"},
            {"name": "Warm Burgundy", "hex_code": "#800020"},
            {"name": "Muted Orange", "hex_code": "#CD5C5C"},
            {"name": "Khaki", "hex_code": "#F0E68C"},
            {"name": "Warm Sage", "hex_code": "#8B8B7A"},
            {"name": "Bronze", "hex_code": "#CD7F32"}
        ],
        "Warm Autumn": [
            {"name": "Dark Orange", "hex_code": "#FF8C00"},
            {"name": "Burnt Sienna", "hex_code": "#E97451"},
            {"name": "Deep Gold", "hex_code": "#B8860B"},
            {"name": "Warm Deep Red", "hex_code": "#8B0000"},
            {"name": "Deep Olive", "hex_code": "#556B2F"},
            {"name": "Rust Brown", "hex_code": "#8B4513"},
            {"name": "Warm Chocolate", "hex_code": "#7B3F00"},
            {"name": "Deep Terracotta", "hex_code": "#A04000"},
            {"name": "Warm Burgundy", "hex_code": "#740001"},
            {"name": "Golden Brown", "hex_code": "#996515"},
            {"name": "Warm Forest Green", "hex_code": "#228B22"},
            {"name": "Deep Rust", "hex_code": "#C85A54"}
        ],
        "Deep Autumn": [
            {"name": "Deep Burgundy", "hex_code": "#740001"},
            {"name": "Deep Orange", "hex_code": "#FF6600"},
            {"name": "Forest Green", "hex_code": "#228B22"},
            {"name": "Deep Brown", "hex_code": "#654321"},
            {"name": "Rich Gold", "hex_code": "#FFD700"},
            {"name": "Deep Red", "hex_code": "#8B0000"},
            {"name": "Chocolate", "hex_code": "#7B3F00"},
            {"name": "Deep Olive", "hex_code": "#556B2F"},
            {"name": "Warm Black", "hex_code": "#2F4F4F"},
            {"name": "Charcoal Brown", "hex_code": "#36454F"},
            {"name": "Deep Gold", "hex_code": "#B8860B"},
            {"name": "Warm Charcoal", "hex_code": "#404040"}
        ],
        "Cool Winter": [
            {"name": "Icy Blue", "hex_code": "#00BFFF"},
            {"name": "Bright Magenta", "hex_code": "#FF00FF"},
            {"name": "Icy Pink", "hex_code": "#FF69B4"},
            {"name": "Bright Red", "hex_code": "#FF0000"},
            {"name": "Cool Black", "hex_code": "#000000"},
            {"name": "Bright White", "hex_code": "#FFFFFF"},
            {"name": "Icy Lavender", "hex_code": "#E0AAFF"},
            {"name": "Bright Purple", "hex_code": "#9400D3"},
            {"name": "Cool Navy", "hex_code": "#000080"},
            {"name": "Charcoal", "hex_code": "#36454F"},
            {"name": "Bright Teal", "hex_code": "#008080"},
            {"name": "Cool Silver", "hex_code": "#C0C0C0"}
        ],
        "Deep Winter": [
            {"name": "Deep Purple", "hex_code": "#301934"},
            {"name": "Jet Black", "hex_code": "#000000"},
            {"name": "Deep Red", "hex_code": "#8B0000"},
            {"name": "Bright Magenta", "hex_code": "#FF1493"},
            {"name": "Cool Navy", "hex_code": "#000080"},
            {"name": "Icy White", "hex_code": "#F0FFFF"},
            {"name": "Deep Teal", "hex_code": "#003333"},
            {"name": "Bright Fuchsia", "hex_code": "#FF00FF"},
            {"name": "Dark Charcoal", "hex_code": "#36454F"},
            {"name": "Royal Blue", "hex_code": "#4169E1"},
            {"name": "Deep Emerald", "hex_code": "#003333"},
            {"name": "Bright White", "hex_code": "#FFFFFF"}
        ],
        "Bright Spring": [
            {"name": "Bright Red", "hex_code": "#FF0000"},
            {"name": "Clear Yellow", "hex_code": "#FFFF00"},
            {"name": "True Blue", "hex_code": "#0000FF"},
            {"name": "Emerald", "hex_code": "#50C878"},
            {"name": "Hot Pink", "hex_code": "#FF69B4"},
            {"name": "Electric Orange", "hex_code": "#FF6600"},
            {"name": "Bright Green", "hex_code": "#00FF00"},
            {"name": "Clear Turquoise", "hex_code": "#40E0D0"},
            {"name": "Magenta", "hex_code": "#FF00FF"},
            {"name": "Bright Purple", "hex_code": "#9400D3"},
            {"name": "Vivid Pink", "hex_code": "#FF1493"},
            {"name": "Lime", "hex_code": "#00FF00"}
        ]
    }
    
    return color_map.get(season, color_map["Light Spring"])


def get_reason_to_suggest(season):
    """Get reason why these colors are suggested."""
    reasons = {
        "Light Spring": "These warm, clear colors enhance your light complexion and natural glow.",
        "Warm Spring": "These vibrant warm colors bring out the warmth in your skin tone.",
        "Bright Spring": "These bright, clear colors complement your fresh and lively appearance.",
        "Light Summer": "These soft, cool colors work harmoniously with your light complexion.",
        "Cool Summer": "These cool, sophisticated colors enhance your natural cool undertone.",
        "Soft Summer": "These muted, cool colors create a harmonious and balanced look.",
        "Light Autumn": "These warm, soft colors complement your light autumn characteristics.",
        "Soft Autumn": "These warm, muted colors enhance your natural warmth and depth.",
        "Warm Autumn": "These deep, warm colors bring out the richness in your complexion.",
        "Deep Autumn": "These rich, warm colors emphasize your deep and intense coloring.",
        "Cool Winter": "These bright, cool colors create striking contrast with your complexion.",
        "Deep Winter": "These deep, cool colors highlight your rich and dramatic coloring.",
        "Bright Spring": "These bright colors perfectly complement your vibrant natural coloring."
    }
    
    return reasons.get(season, "These colors are perfect for your color season.")


def get_colors_to_avoid(season):
    """Get colors to avoid for a given season."""
    color_map = {
        "Light Spring": [
            {"name": "Deep Black", "hex_code": "#000000"},
            {"name": "Muddy Brown", "hex_code": "#3E2723"},
            {"name": "Cool Gray", "hex_code": "#808080"},
            {"name": "Olive Green", "hex_code": "#808000"},
            {"name": "Deep Purple", "hex_code": "#301934"},
            {"name": "Harsh Navy", "hex_code": "#000080"},
            {"name": "Dusty Rose", "hex_code": "#DCAE96"},
            {"name": "Maroon", "hex_code": "#800000"},
            {"name": "Charcoal", "hex_code": "#36454F"},
            {"name": "Forest Green", "hex_code": "#228B22"},
            {"name": "Deep Burgundy", "hex_code": "#740001"},
            {"name": "Muddy Gray", "hex_code": "#595959"}
        ],
        "Warm Spring": [
            {"name": "Icy Blue", "hex_code": "#00BFFF"},
            {"name": "Cool Pink", "hex_code": "#FF1493"},
            {"name": "Cool Gray", "hex_code": "#808080"},
            {"name": "Deep Purple", "hex_code": "#301934"},
            {"name": "Cool Navy", "hex_code": "#000080"},
            {"name": "Mauve", "hex_code": "#E0B0FF"},
            {"name": "Cool Lavender", "hex_code": "#E6E6FA"},
            {"name": "Dusty Blue", "hex_code": "#6A8CAF"},
            {"name": "Charcoal Gray", "hex_code": "#36454F"},
            {"name": "Cool Black", "hex_code": "#000000"},
            {"name": "Icy White", "hex_code": "#F0FFFF"},
            {"name": "Cool Burgundy", "hex_code": "#800020"}
        ],
        "Bright Spring": [
            {"name": "Muddy Colors", "hex_code": "#8B7355"},
            {"name": "Soft Pastels", "hex_code": "#D8BFD8"},
            {"name": "Cool Gray", "hex_code": "#808080"},
            {"name": "Muted Brown", "hex_code": "#8B6914"},
            {"name": "Dusty Colors", "hex_code": "#B38B8B"},
            {"name": "Deep Burgundy", "hex_code": "#740001"},
            {"name": "Olive", "hex_code": "#808000"},
            {"name": "Taupe", "hex_code": "#B38B8B"},
            {"name": "Muddy Green", "hex_code": "#556B2F"},
            {"name": "Gray", "hex_code": "#808080"},
            {"name": "Charcoal", "hex_code": "#36454F"},
            {"name": "Muddy Purple", "hex_code": "#6B4423"}
        ],
        "Light Summer": [
            {"name": "Warm Orange", "hex_code": "#FF8C00"},
            {"name": "Warm Gold", "hex_code": "#FFD700"},
            {"name": "Terracotta", "hex_code": "#E2725B"},
            {"name": "Warm Brown", "hex_code": "#A0826D"},
            {"name": "Rust", "hex_code": "#B7410E"},
            {"name": "Deep Red", "hex_code": "#8B0000"},
            {"name": "Olive Green", "hex_code": "#808000"},
            {"name": "Warm Black", "hex_code": "#2F4F4F"},
            {"name": "Deep Purple", "hex_code": "#301934"},
            {"name": "Burnt Orange", "hex_code": "#CC5500"},
            {"name": "Muddy Green", "hex_code": "#556B2F"},
            {"name": "Warm Burgundy", "hex_code": "#740001"}
        ],
        "Cool Summer": [
            {"name": "Warm Orange", "hex_code": "#FF8C00"},
            {"name": "Terracotta", "hex_code": "#E2725B"},
            {"name": "Warm Brown", "hex_code": "#A0826D"},
            {"name": "Olive", "hex_code": "#808000"},
            {"name": "Warm Gold", "hex_code": "#FFD700"},
            {"name": "Rust", "hex_code": "#B7410E"},
            {"name": "Warm Beige", "hex_code": "#F5DEB3"},
            {"name": "Golden Brown", "hex_code": "#996515"},
            {"name": "Warm Taupe", "hex_code": "#B38B8B"},
            {"name": "Deep Warm Red", "hex_code": "#8B0000"},
            {"name": "Muddy Orange", "hex_code": "#CD5C5C"},
            {"name": "Warm Charcoal", "hex_code": "#404040"}
        ],
        "Soft Summer": [
            {"name": "Bright Red", "hex_code": "#FF0000"},
            {"name": "Bright Orange", "hex_code": "#FF8C00"},
            {"name": "Bright Yellow", "hex_code": "#FFFF00"},
            {"name": "Deep Black", "hex_code": "#000000"},
            {"name": "Bright White", "hex_code": "#FFFFFF"},
            {"name": "Rust", "hex_code": "#B7410E"},
            {"name": "Deep Burgundy", "hex_code": "#740001"},
            {"name": "Muddy Brown", "hex_code": "#3E2723"},
            {"name": "Warm Gold", "hex_code": "#FFD700"},
            {"name": "Bright Magenta", "hex_code": "#FF1493"},
            {"name": "Intense Blue", "hex_code": "#0000FF"},
            {"name": "Harsh Contrast Colors", "hex_code": "#000000"}
        ],
        "Light Autumn": [
            {"name": "Icy Blue", "hex_code": "#00BFFF"},
            {"name": "Cool Pink", "hex_code": "#FF1493"},
            {"name": "Deep Black", "hex_code": "#000000"},
            {"name": "Bright White", "hex_code": "#FFFFFF"},
            {"name": "Cool Gray", "hex_code": "#808080"},
            {"name": "Cool Lavender", "hex_code": "#E6E6FA"},
            {"name": "Icy Colors", "hex_code": "#F0FFFF"},
            {"name": "Deep Purple", "hex_code": "#301934"},
            {"name": "Cool Navy", "hex_code": "#000080"},
            {"name": "Mauve", "hex_code": "#E0B0FF"},
            {"name": "Dusty Rose", "hex_code": "#DCAE96"},
            {"name": "Cool Burgundy", "hex_code": "#800020"}
        ],
        "Soft Autumn": [
            {"name": "Bright Colors", "hex_code": "#FF0000"},
            {"name": "Icy Blue", "hex_code": "#00BFFF"},
            {"name": "Bright White", "hex_code": "#FFFFFF"},
            {"name": "Deep Black", "hex_code": "#000000"},
            {"name": "Cool Pink", "hex_code": "#FF1493"},
            {"name": "Harsh Gray", "hex_code": "#808080"},
            {"name": "Cool Lavender", "hex_code": "#E6E6FA"},
            {"name": "Bright Yellow", "hex_code": "#FFFF00"},
            {"name": "Bright Orange", "hex_code": "#FF8C00"},
            {"name": "Cool Navy", "hex_code": "#000080"},
            {"name": "Icy Colors", "hex_code": "#F0FFFF"},
            {"name": "Mauve", "hex_code": "#E0B0FF"}
        ],
        "Warm Autumn": [
            {"name": "Icy Colors", "hex_code": "#F0FFFF"},
            {"name": "Cool Pink", "hex_code": "#FF1493"},
            {"name": "Cool Gray", "hex_code": "#808080"},
            {"name": "Dusty Colors", "hex_code": "#B38B8B"},
            {"name": "Bright White", "hex_code": "#FFFFFF"},
            {"name": "Cool Lavender", "hex_code": "#E6E6FA"},
            {"name": "Mauve", "hex_code": "#E0B0FF"},
            {"name": "Cool Navy", "hex_code": "#000080"},
            {"name": "Icy Blue", "hex_code": "#00BFFF"},
            {"name": "Soft Pastels", "hex_code": "#D8BFD8"},
            {"name": "Cool Burgundy", "hex_code": "#800020"},
            {"name": "Light Colors", "hex_code": "#FFFACD"}
        ],
        "Deep Autumn": [
            {"name": "Soft Pastels", "hex_code": "#D8BFD8"},
            {"name": "Light Colors", "hex_code": "#FFFACD"},
            {"name": "Icy Blue", "hex_code": "#00BFFF"},
            {"name": "Bright White", "hex_code": "#FFFFFF"},
            {"name": "Cool Pink", "hex_code": "#FF1493"},
            {"name": "Cool Gray", "hex_code": "#808080"},
            {"name": "Dusty Colors", "hex_code": "#B38B8B"},
            {"name": "Cool Lavender", "hex_code": "#E6E6FA"},
            {"name": "Pale Colors", "hex_code": "#FFB6C1"},
            {"name": "Cool Navy", "hex_code": "#000080"},
            {"name": "Mauve", "hex_code": "#E0B0FF"},
            {"name": "Soft Yellow", "hex_code": "#FFFFE0"}
        ],
        "Cool Winter": [
            {"name": "Warm Orange", "hex_code": "#FF8C00"},
            {"name": "Warm Gold", "hex_code": "#FFD700"},
            {"name": "Terracotta", "hex_code": "#E2725B"},
            {"name": "Warm Brown", "hex_code": "#A0826D"},
            {"name": "Rust", "hex_code": "#B7410E"},
            {"name": "Olive", "hex_code": "#808000"},
            {"name": "Warm Beige", "hex_code": "#F5DEB3"},
            {"name": "Muddy Colors", "hex_code": "#8B7355"},
            {"name": "Soft Pastels", "hex_code": "#D8BFD8"},
            {"name": "Warm Taupe", "hex_code": "#B38B8B"},
            {"name": "Muddy Green", "hex_code": "#556B2F"},
            {"name": "Warm Burgundy", "hex_code": "#740001"}
        ],
        "Deep Winter": [
            {"name": "Warm Colors", "hex_code": "#FF8C00"},
            {"name": "Soft Pastels", "hex_code": "#D8BFD8"},
            {"name": "Warm Gold", "hex_code": "#FFD700"},
            {"name": "Warm Brown", "hex_code": "#A0826D"},
            {"name": "Dusty Colors", "hex_code": "#B38B8B"},
            {"name": "Olive Green", "hex_code": "#808000"},
            {"name": "Warm Beige", "hex_code": "#F5DEB3"},
            {"name": "Light Colors", "hex_code": "#FFFACD"},
            {"name": "Muted Colors", "hex_code": "#A9A9A9"},
            {"name": "Terracotta", "hex_code": "#E2725B"},
            {"name": "Warm Taupe", "hex_code": "#B38B8B"},
            {"name": "Muddy Green", "hex_code": "#556B2F"}
        ],
        "Bright Spring": [
            {"name": "Muddy Colors", "hex_code": "#8B7355"},
            {"name": "Soft Pastels", "hex_code": "#D8BFD8"},
            {"name": "Muted Brown", "hex_code": "#8B6914"},
            {"name": "Dusty Colors", "hex_code": "#B38B8B"},
            {"name": "Muddy Green", "hex_code": "#556B2F"},
            {"name": "Taupe", "hex_code": "#B38B8B"},
            {"name": "Gray", "hex_code": "#808080"},
            {"name": "Charcoal", "hex_code": "#36454F"},
            {"name": "Cool Gray", "hex_code": "#D3D3D3"},
            {"name": "Muddy Purple", "hex_code": "#6B4423"},
            {"name": "Olive", "hex_code": "#808000"},
            {"name": "Warm Taupe", "hex_code": "#B38B8B"}
        ]
    }
    
    return color_map.get(season, color_map["Light Spring"])


def get_reason_to_avoid(season):
    """Get reason why these colors should be avoided."""
    reasons = {
        "Light Spring": "Deep, muted colors can make your complexion appear washed out.",
        "Warm Spring": "Cool and muddy colors clash with your warm undertone.",
        "Bright Spring": "Muted and soft colors dilute your natural brightness.",
        "Light Summer": "Warm and intense colors overpower your soft, light appearance.",
        "Cool Summer": "Warm and orange-based colors clash with your cool undertone.",
        "Soft Summer": "Bright and harsh colors create unflattering contrast.",
        "Light Autumn": "Cool and icy colors clash with your warm characteristics.",
        "Soft Autumn": "Bright and harsh colors overpower your muted natural coloring.",
        "Warm Autumn": "Cool and icy colors diminish your warm, rich complexion.",
        "Deep Autumn": "Light and soft colors compete with your deep natural coloring.",
        "Cool Winter": "Warm and muddy colors clash with your cool, clear complexion.",
        "Deep Winter": "Soft and muted colors can make you appear washed out.",
        "Bright Spring": "Soft and muted colors diminish your vibrant natural coloring."
    }
    
    return reasons.get(season, "These colors may not be the most flattering for you.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
