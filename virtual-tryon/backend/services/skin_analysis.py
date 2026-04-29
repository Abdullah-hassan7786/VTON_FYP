#!/usr/bin/env python3
"""
face_detection.py — Local Skin Tone Analysis & Color Season Server
===================================================================
FastAPI server that powers the rizz-up image processing pipeline locally.

Pipeline:
  POST /api/images/crop
    - Accepts multipart/form-data with an "image" field
    - Detects face via OpenCV Haar Cascade, crops & resizes to 512×512
    - Falls back to centre-square crop if no face found
    - Returns: { "cropped_image": "<base64 JPEG>" }

  POST /api/images/analyze
    - Accepts JSON: { "base64Image": "<base64 JPEG>" }
    - Extracts skin pixels, clusters dominant skin tone
    - Maps to one of 12 seasonal color types
    - Returns the same JSON format expected by the /analysis page

Install (once):
  pip install fastapi uvicorn python-multipart opencv-python Pillow scikit-learn numpy

Run:
  python face_detection.py
  → http://localhost:8000

Changes from v1:
  [FIX-1] Season classifier now uses saturation/chroma as a third axis,
          making Soft Autumn reachable for warm-medium skin and correctly
          routing Bright Spring as a high-brightness clear-warm season.
  [FIX-2] K-Means sampling now uses a random shuffle before slicing to
          avoid spatial bias toward the top-left of the skin mask.
  [FIX-3] Fallback crop bias is now aspect-ratio aware — landscape images
          use a centred crop rather than the upward-biased portrait crop.
  [FIX-4] K-Means n_init raised from 3 → 10 and max_iter 100 → 200 for
          stable, reproducible cluster centroids.
  [FIX-5] chroma is now fully computed from saturation and actually used
          in map_to_season (the stale "will refine below" comment removed).
  [FIX-6] Base64 payload size is validated before decoding to give a clean
          400 error instead of a cryptic cv2 crash.
"""

import base64
import io
import sys
import numpy as np
import cv2
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from sklearn.cluster import KMeans

# ──────────────────────────────────────────────────────────────────────────────
# App
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="Rizz-Up Skin Analysis Service", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)
OUTPUT_SIZE  = 512
FACE_PADDING = 0.4

# Pre-computed HSV skin tone ranges
HSV_SKIN_LOWER1 = np.array([0,   20,  60])
HSV_SKIN_UPPER1 = np.array([20,  190, 255])
HSV_SKIN_LOWER2 = np.array([160, 20,  60])
HSV_SKIN_UPPER2 = np.array([180, 190, 255])

# Thresholds for skin classification
BRIGHTNESS_LIGHT_THRESHOLD  = 170   # above → light
BRIGHTNESS_DARK_THRESHOLD   = 100   # below → dark
WARMTH_WARM_THRESHOLD       =  20   # r - b above → warm undertone
WARMTH_COOL_THRESHOLD       = -10   # r - b below → cool undertone
SATURATION_CLEAR_THRESHOLD  =  0.25 # above → clear chroma, below → soft
KMEANS_SAMPLE_SIZE          = 5000  # max pixels fed to K-Means
MIN_SKIN_PIXELS             = 200   # fallback if fewer skin px detected


# ──────────────────────────────────────────────────────────────────────────────
# Seasonal color database  (mirrors seasonsData.ts)
# ──────────────────────────────────────────────────────────────────────────────

SEASONS_DB = {
    "Light Spring": {
        "characteristics": "Fair skin with peachy or rosy undertones, golden-blonde/light-brown hair, light eyes (blue, green, hazel).",
        "undertone": "warm", "lightness": "light", "chroma": "clear",
        "suggest": [
            {"name": "Soft Yellow", "hex_code": "#F0EC71"},
            {"name": "Coral Pink",  "hex_code": "#F2A595"},
            {"name": "Mint Green",  "hex_code": "#74C7B3"},
            {"name": "Warm Peach",  "hex_code": "#F0A6B7"},
            {"name": "Sky Blue",    "hex_code": "#72C9DB"},
            {"name": "Sage Green",  "hex_code": "#CCDF86"},
            {"name": "Warm Cream",  "hex_code": "#D1BE9E"},
            {"name": "Teal",        "hex_code": "#27B4C8"},
            {"name": "Dusty Rose",  "hex_code": "#F0A6B7"},
            {"name": "Spring Green","hex_code": "#7DA07A"},
            {"name": "Light Lilac", "hex_code": "#D0D2D5"},
            {"name": "Warm Gold",   "hex_code": "#A69F45"},
        ],
        "avoid": [
            {"name": "Black",        "hex_code": "#1A1A1A"},
            {"name": "Charcoal",     "hex_code": "#36454F"},
            {"name": "Deep Burgundy","hex_code": "#800020"},
            {"name": "Dark Navy",    "hex_code": "#0A1628"},
            {"name": "Olive Drab",   "hex_code": "#6B6B37"},
            {"name": "Mustard",      "hex_code": "#FFDB58"},
            {"name": "Dark Forest",  "hex_code": "#014421"},
            {"name": "Deep Purple",  "hex_code": "#4B0082"},
            {"name": "Slate Grey",   "hex_code": "#708090"},
            {"name": "Dark Brown",   "hex_code": "#5C4033"},
            {"name": "Cold Grey",    "hex_code": "#B0B7BC"},
            {"name": "Neon Orange",  "hex_code": "#FF5733"},
        ],
        "reason_suggest": "Light, warm, and clear colors enhance your delicate peachy complexion without overpowering it.",
        "reason_avoid":   "Dark, cool, or overpowering hues wash out your natural light coloring.",
        "content": "Based on the image provided, you have a Light Spring palette — characterized by fair skin with warm, peachy undertones and a soft, luminous quality.",
    },
    "Warm Spring": {
        "characteristics": "Warm-toned skin (porcelain to light bronze), golden/strawberry-blonde/copper hair, light warm eyes.",
        "undertone": "warm", "lightness": "light", "chroma": "warm",
        "suggest": [
            {"name": "Golden Yellow",  "hex_code": "#E6C568"},
            {"name": "Warm Coral",     "hex_code": "#F37E6B"},
            {"name": "Bright Orange",  "hex_code": "#ECAB4D"},
            {"name": "Spring Green",   "hex_code": "#90BB53"},
            {"name": "Warm Mint",      "hex_code": "#49BB74"},
            {"name": "Oceanic Teal",   "hex_code": "#2E8D80"},
            {"name": "Golden Olive",   "hex_code": "#D84C63"},
            {"name": "Sky Blue",       "hex_code": "#4AA2D6"},
            {"name": "Warm Pink",      "hex_code": "#EE7F91"},
            {"name": "Sunflower",      "hex_code": "#E6C568"},
            {"name": "Lilac Warm",     "hex_code": "#9C7FB5"},
            {"name": "Bright Teal",    "hex_code": "#2E75B9"},
        ],
        "avoid": [
            {"name": "Icy Blue",       "hex_code": "#AFDBF5"},
            {"name": "Cool Lavender",  "hex_code": "#DCD0FF"},
            {"name": "Deep Navy",      "hex_code": "#001F54"},
            {"name": "Black",          "hex_code": "#1A1A1A"},
            {"name": "Ash Grey",       "hex_code": "#B2BEB5"},
            {"name": "Cool Fuchsia",   "hex_code": "#E0115F"},
            {"name": "Dark Plum",      "hex_code": "#4F0028"},
            {"name": "Steel Blue",     "hex_code": "#4682B4"},
            {"name": "Chalky Pink",    "hex_code": "#F4C2C2"},
            {"name": "Cool Teal",      "hex_code": "#008080"},
            {"name": "Dark Charcoal",  "hex_code": "#36454F"},
            {"name": "Cool Mint",      "hex_code": "#98FF98"},
        ],
        "reason_suggest": "Vibrant, warm-toned colors accentuate your natural golden glow and warm undertones.",
        "reason_avoid":   "Cool-toned pastels and dark shades clash with your warm radiance.",
        "content": "Based on the image provided, you have a Warm Spring palette — golden, vibrant skin tones with an overall warm, sun-kissed glow.",
    },
    "Bright Spring": {
        "characteristics": "High-contrast coloring; varied hair from blonde to dark brown; skin from pale to golden brown; vivid eyes.",
        "undertone": "warm", "lightness": "medium", "chroma": "clear",
        "suggest": [
            {"name": "Vivid Blue",    "hex_code": "#277DBB"},
            {"name": "Hot Pink",      "hex_code": "#E6475D"},
            {"name": "Bright Green",  "hex_code": "#5B9C34"},
            {"name": "Cobalt",        "hex_code": "#254F92"},
            {"name": "Coral Red",     "hex_code": "#E9704D"},
            {"name": "Turquoise",     "hex_code": "#39B3BE"},
            {"name": "Violet",        "hex_code": "#8C62A4"},
            {"name": "Lime",          "hex_code": "#91B748"},
            {"name": "Magenta",       "hex_code": "#E04673"},
            {"name": "Bright Teal",   "hex_code": "#1D8682"},
            {"name": "Warm Orange",   "hex_code": "#E89F46"},
            {"name": "Frosty Yellow", "hex_code": "#F4CA6E"},
        ],
        "avoid": [
            {"name": "Dusty Rose",    "hex_code": "#DCAE96"},
            {"name": "Muted Sage",    "hex_code": "#8A9A5B"},
            {"name": "Taupe",         "hex_code": "#8B8589"},
            {"name": "Dusty Blue",    "hex_code": "#7F9AAF"},
            {"name": "Nude Beige",    "hex_code": "#E3CDB5"},
            {"name": "Muted Mauve",   "hex_code": "#997A8D"},
            {"name": "Warm Tan",      "hex_code": "#D2B48C"},
            {"name": "Pale Peach",    "hex_code": "#FFB98E"},
            {"name": "Dusty Coral",   "hex_code": "#E59079"},
            {"name": "Faded Olive",   "hex_code": "#9EA57E"},
            {"name": "Dusty Plum",    "hex_code": "#906090"},
            {"name": "Greyed Teal",   "hex_code": "#7C9EA8"},
        ],
        "reason_suggest": "Saturated, clear warm hues with a touch of coolness let your high-contrast coloring shine.",
        "reason_avoid":   "Muted or dusty pastels and nudes wash out your vivid features.",
        "content": "Based on the image provided, you have a Bright Spring palette — high-contrast coloring that calls for vivid, clear, and vibrant hues.",
    },
    "Light Summer": {
        "characteristics": "Neutral skin that burns easily, rosy tint; icy blonde/light-brown hair; light blue, green, or grey eyes.",
        "undertone": "cool", "lightness": "light", "chroma": "soft",
        "suggest": [
            {"name": "Powder Blue",   "hex_code": "#90ADD7"},
            {"name": "Soft Rose",     "hex_code": "#F19BB8"},
            {"name": "Mint",          "hex_code": "#84CDB2"},
            {"name": "Lilac",         "hex_code": "#9885BD"},
            {"name": "Sky Teal",      "hex_code": "#75CCDD"},
            {"name": "Blush Pink",    "hex_code": "#F07182"},
            {"name": "Warm Sand",     "hex_code": "#F2DAB4"},
            {"name": "Lavender",      "hex_code": "#CCD0D5"},
            {"name": "Soft Gold",     "hex_code": "#F6D087"},
            {"name": "Sea Foam",      "hex_code": "#2CA17C"},
            {"name": "Dusty Teal",    "hex_code": "#2A8598"},
            {"name": "Soft Coral",    "hex_code": "#E1465F"},
        ],
        "avoid": [
            {"name": "Black",         "hex_code": "#1A1A1A"},
            {"name": "Bright Orange", "hex_code": "#FF6B35"},
            {"name": "Warm Brown",    "hex_code": "#A05C34"},
            {"name": "Rust",          "hex_code": "#B7410E"},
            {"name": "Bright Red",    "hex_code": "#CC0000"},
            {"name": "Deep Olive",    "hex_code": "#6B6B37"},
            {"name": "Gold Yellow",   "hex_code": "#FFD700"},
            {"name": "Burnt Sienna",  "hex_code": "#E97451"},
            {"name": "Warm Mustard",  "hex_code": "#FFBC42"},
            {"name": "Electric Blue", "hex_code": "#007BFF"},
            {"name": "Vivid Green",   "hex_code": "#00B04F"},
            {"name": "Neon Pink",     "hex_code": "#FF69B4"},
        ],
        "reason_suggest": "Light, dusty, powdery colors complement your delicate cool-toned features.",
        "reason_avoid":   "Dark colors and warm high-saturation tones overpower your subtle coloring.",
        "content": "Based on the image provided, you have a Light Summer palette — cool, refined skin tones that look best in soft, airy hues.",
    },
    "Cool Summer": {
        "characteristics": "Cool blue undertones; neutral to cool skin; grey/blue/slate eyes; ashy medium to dark-brown hair.",
        "undertone": "cool", "lightness": "medium", "chroma": "soft",
        "suggest": [
            {"name": "Periwinkle",    "hex_code": "#A2C1EB"},
            {"name": "Dusty Mauve",   "hex_code": "#C47598"},
            {"name": "Slate Blue",    "hex_code": "#4675AD"},
            {"name": "Soft Plum",     "hex_code": "#665D94"},
            {"name": "Sea Green",     "hex_code": "#079898"},
            {"name": "Rose Pink",     "hex_code": "#EA6F8D"},
            {"name": "Ice Blue",      "hex_code": "#A2C1EB"},
            {"name": "Muted Teal",    "hex_code": "#148E8D"},
            {"name": "Dusty Purple",  "hex_code": "#4D4477"},
            {"name": "Cool Coral",    "hex_code": "#C15372"},
            {"name": "Icy Lavender",  "hex_code": "#F6C0D6"},
            {"name": "Teal Blue",     "hex_code": "#0191A0"},
        ],
        "avoid": [
            {"name": "Warm Orange",   "hex_code": "#FF8300"},
            {"name": "Mustard",       "hex_code": "#FFBC42"},
            {"name": "Rust",          "hex_code": "#B7410E"},
            {"name": "Warm Beige",    "hex_code": "#D4B896"},
            {"name": "Olive Green",   "hex_code": "#808000"},
            {"name": "Camel",         "hex_code": "#C19A6B"},
            {"name": "Golden Brown",  "hex_code": "#986515"},
            {"name": "Terracotta",    "hex_code": "#CB6D51"},
            {"name": "Warm Gold",     "hex_code": "#FFD700"},
            {"name": "Brick Red",     "hex_code": "#8B0000"},
            {"name": "Copper",        "hex_code": "#B87333"},
            {"name": "Warm Tan",      "hex_code": "#D2B48C"},
        ],
        "reason_suggest": "Cool hues with a muted quality and blue-pink undertones perfectly complement your cool coloring.",
        "reason_avoid":   "Warm tones especially yellow-based hues clash with your cool undertones.",
        "content": "Based on the image provided, you have a Cool Summer palette — cool, sophisticated coloring that shines in muted, blue-toned hues.",
    },
    "Soft Summer": {
        "characteristics": "Neutral/cool skin with pink tint; light to medium ashy-brown hair; low contrast between eye, hair, and skin.",
        "undertone": "cool", "lightness": "medium", "chroma": "soft",
        "suggest": [
            {"name": "Dusty Blue",    "hex_code": "#A0C1EA"},
            {"name": "Muted Mauve",   "hex_code": "#C47598"},
            {"name": "Sage",          "hex_code": "#79C1AA"},
            {"name": "Powder Pink",   "hex_code": "#F4C1D6"},
            {"name": "Slate",         "hex_code": "#929AA5"},
            {"name": "Rose Taupe",    "hex_code": "#AA8B8D"},
            {"name": "Dusty Teal",    "hex_code": "#4CB5C6"},
            {"name": "Soft Lavender", "hex_code": "#9492C3"},
            {"name": "Misty Green",   "hex_code": "#449882"},
            {"name": "Icy Pink",      "hex_code": "#EB859E"},
            {"name": "Cool Denim",    "hex_code": "#4675AD"},
            {"name": "Storm Blue",    "hex_code": "#6F7B95"},
        ],
        "avoid": [
            {"name": "Neon Colours",  "hex_code": "#39FF14"},
            {"name": "Bright Red",    "hex_code": "#CC0000"},
            {"name": "Vivid Orange",  "hex_code": "#FF5733"},
            {"name": "Rich Gold",     "hex_code": "#FFD700"},
            {"name": "Black",         "hex_code": "#1A1A1A"},
            {"name": "Pure White",    "hex_code": "#FFFFFF"},
            {"name": "Hot Pink",      "hex_code": "#FF69B4"},
            {"name": "Vivid Green",   "hex_code": "#00CC44"},
            {"name": "Electric Blue", "hex_code": "#007BFF"},
            {"name": "Bright Purple", "hex_code": "#8B00FF"},
            {"name": "Warm Copper",   "hex_code": "#B87333"},
            {"name": "Lime Green",    "hex_code": "#32CD32"},
        ],
        "reason_suggest": "Soft, muted, cool-leaning hues harmonize with your low-contrast, ethereal complexion.",
        "reason_avoid":   "Clear, neon, or rich colors overwhelm your delicate coloring.",
        "content": "Based on the image provided, you have a Soft Summer palette — gentle, muted tones that reflect your soft and refined natural coloring.",
    },
    "Soft Autumn": {
        "characteristics": "Little contrast between hair and skin; neutral to warm undertones; low-intensity overall appearance.",
        "undertone": "warm", "lightness": "medium", "chroma": "soft",
        "suggest": [
            {"name": "Warm Sage",     "hex_code": "#93926A"},
            {"name": "Dusty Coral",   "hex_code": "#EFA4A2"},
            {"name": "Warm Taupe",    "hex_code": "#CCA480"},
            {"name": "Muted Teal",    "hex_code": "#478F85"},
            {"name": "Terracotta",    "hex_code": "#A24B4A"},
            {"name": "Soft Green",    "hex_code": "#86BC9C"},
            {"name": "Warm Blush",    "hex_code": "#F4C4BA"},
            {"name": "Steel Blue",    "hex_code": "#78AACB"},
            {"name": "Dusty Mauve",   "hex_code": "#E88484"},
            {"name": "Olive",         "hex_code": "#929D7A"},
            {"name": "Warm Gold",     "hex_code": "#E0B88D"},
            {"name": "Dusty Rose",    "hex_code": "#EC827E"},
        ],
        "avoid": [
            {"name": "Black",         "hex_code": "#1A1A1A"},
            {"name": "Fuchsia",       "hex_code": "#FF00FF"},
            {"name": "Icy White",     "hex_code": "#F5F5FF"},
            {"name": "Neon Yellow",   "hex_code": "#FFFF00"},
            {"name": "Electric Blue", "hex_code": "#007FFF"},
            {"name": "Hot Pink",      "hex_code": "#FF69B4"},
            {"name": "Vivid Purple",  "hex_code": "#7B00D4"},
            {"name": "Cool Silver",   "hex_code": "#C0C0C0"},
            {"name": "Bright Teal",   "hex_code": "#00CED1"},
            {"name": "Stark White",   "hex_code": "#FFFFFF"},
            {"name": "Charcoal",      "hex_code": "#36454F"},
            {"name": "Cool Blue",     "hex_code": "#4682B4"},
        ],
        "reason_suggest": "Muted warm tones with earthy depth complement your neutral-to-warm blended complexion.",
        "reason_avoid":   "Stark colours like black or bright fuchsia make you appear sallow.",
        "content": "Based on the image provided, you have a Soft Autumn palette — a warm, muted complexion that glows in earthy, blended tones.",
    },
    "Warm Autumn": {
        "characteristics": "Ivory to medium-brown skin with warm/golden undertones; medium to dark brown/auburn hair; light brown, green, or hazel eyes.",
        "undertone": "warm", "lightness": "medium", "chroma": "warm",
        "suggest": [
            {"name": "Rust",          "hex_code": "#C56248"},
            {"name": "Butterscotch",  "hex_code": "#FDD077"},
            {"name": "Warm Olive",    "hex_code": "#867C41"},
            {"name": "Pumpkin",       "hex_code": "#E09758"},
            {"name": "Forest Green",  "hex_code": "#2E543D"},
            {"name": "Terracotta",    "hex_code": "#E06450"},
            {"name": "Gold",          "hex_code": "#C1974D"},
            {"name": "Rich Teal",     "hex_code": "#20828D"},
            {"name": "Warm Burgundy", "hex_code": "#8F4345"},
            {"name": "Golden Khaki",  "hex_code": "#C7C089"},
            {"name": "Caramel",       "hex_code": "#B47C65"},
            {"name": "Earthy Red",    "hex_code": "#B64C34"},
        ],
        "avoid": [
            {"name": "Pastel Pink",   "hex_code": "#FFD1DC"},
            {"name": "Baby Blue",     "hex_code": "#89CFF0"},
            {"name": "Lavender",      "hex_code": "#DCD0FF"},
            {"name": "Cool Grey",     "hex_code": "#C0C0C8"},
            {"name": "Fuchsia",       "hex_code": "#FF00FF"},
            {"name": "Black",         "hex_code": "#1A1A1A"},
            {"name": "Icy White",     "hex_code": "#F0F8FF"},
            {"name": "Periwinkle",    "hex_code": "#CCCCFF"},
            {"name": "Cool Mint",     "hex_code": "#98FF98"},
            {"name": "Hot Pink",      "hex_code": "#FF69B4"},
            {"name": "Electric Blue", "hex_code": "#007BFF"},
            {"name": "Silver",        "hex_code": "#C0C0C0"},
        ],
        "reason_suggest": "Rich, earthy warm tones like rust, pumpkin and gold make your warm-toned skin glow.",
        "reason_avoid":   "Pastels and cool bright tones wash out your warm, golden complexion.",
        "content": "Based on the image provided, you have a Warm Autumn palette — rich, golden undertones that shine in earthy, deep warm hues.",
    },
    "Deep Autumn": {
        "characteristics": "Warm tones in hair, eyes, and skin; medium to dark brown hair with golden undertones; dark eyes.",
        "undertone": "warm", "lightness": "dark", "chroma": "warm",
        "suggest": [
            {"name": "Brick Red",     "hex_code": "#903427"},
            {"name": "Warm Teal",     "hex_code": "#399896"},
            {"name": "Dusty Pink",    "hex_code": "#D4A0BA"},
            {"name": "Olive Gold",    "hex_code": "#A09255"},
            {"name": "Dark Burgundy", "hex_code": "#672C37"},
            {"name": "Rich Teal",     "hex_code": "#105D4B"},
            {"name": "Salmon",        "hex_code": "#E88468"},
            {"name": "Steel Blue",    "hex_code": "#2F98B9"},
            {"name": "Warm Purple",   "hex_code": "#C0789A"},
            {"name": "Butterscotch",  "hex_code": "#D7B569"},
            {"name": "Rose Brown",    "hex_code": "#82473F"},
            {"name": "Autumn Khaki",  "hex_code": "#636A3A"},
        ],
        "avoid": [
            {"name": "Dusty Lilac",   "hex_code": "#C8A4D4"},
            {"name": "Pastel Yellow", "hex_code": "#FDFEB0"},
            {"name": "Baby Pink",     "hex_code": "#FFB6C1"},
            {"name": "Chalky Blue",   "hex_code": "#ABC4CC"},
            {"name": "Muted Sage",    "hex_code": "#A8B89A"},
            {"name": "Soft Beige",    "hex_code": "#E8D5C0"},
            {"name": "Pale Coral",    "hex_code": "#F5C5A3"},
            {"name": "Greyed Green",  "hex_code": "#9BA89A"},
            {"name": "Dusty Taupe",   "hex_code": "#BEB4A8"},
            {"name": "Faded Rose",    "hex_code": "#D9A7A3"},
            {"name": "Ash Blond",     "hex_code": "#CFC39A"},
            {"name": "Pale Gold",     "hex_code": "#EDD68A"},
        ],
        "reason_suggest": "Bold, warm, pigment-rich colors complement your deep warm coloring beautifully.",
        "reason_avoid":   "Dusty or soft pastels make your complexion appear washed out.",
        "content": "Based on the image provided, you have a Deep Autumn palette — rich, warm depth that calls for bold, saturated earthy tones.",
    },
    "Deep Winter": {
        "characteristics": "Rich, high-contrast look; neutral to olive skin; dark eyes and dark hair.",
        "undertone": "cool", "lightness": "dark", "chroma": "clear",
        "suggest": [
            {"name": "True Red",      "hex_code": "#CD3851"},
            {"name": "Deep Teal",     "hex_code": "#07776C"},
            {"name": "Royal Blue",    "hex_code": "#2C6FB1"},
            {"name": "Vivid Purple",  "hex_code": "#773E72"},
            {"name": "Electric Blue", "hex_code": "#7DB1E4"},
            {"name": "Emerald",       "hex_code": "#007255"},
            {"name": "Fuchsia",       "hex_code": "#CD4D7D"},
            {"name": "Forest Green",  "hex_code": "#205749"},
            {"name": "Bright Pink",   "hex_code": "#EA5E73"},
            {"name": "Icy Blue",      "hex_code": "#C8DDD4"},
            {"name": "Bold Berry",    "hex_code": "#5B3443"},
            {"name": "Clear Yellow",  "hex_code": "#F7E069"},
        ],
        "avoid": [
            {"name": "Warm Camel",    "hex_code": "#C19A6B"},
            {"name": "Mustard",       "hex_code": "#FFBC42"},
            {"name": "Warm Brown",    "hex_code": "#A05C34"},
            {"name": "Rust Orange",   "hex_code": "#B7410E"},
            {"name": "Warm Beige",    "hex_code": "#D4B896"},
            {"name": "Olive",         "hex_code": "#808000"},
            {"name": "Terracotta",    "hex_code": "#CB6D51"},
            {"name": "Warm Gold",     "hex_code": "#FFD700"},
            {"name": "Peach",         "hex_code": "#FFCBA4"},
            {"name": "Caramel",       "hex_code": "#C68642"},
            {"name": "Warm Tan",      "hex_code": "#D2B48C"},
            {"name": "Copper",        "hex_code": "#B87333"},
        ],
        "reason_suggest": "High-saturation, rich primary colors and pure pigments complement your dramatic deep coloring.",
        "reason_avoid":   "Earthy tones and warm nudes clash with your cool, high-contrast features.",
        "content": "Based on the image provided, you have a Deep Winter palette — bold, dramatic coloring that excels in high-saturation, rich cool hues.",
    },
    "Cool Winter": {
        "characteristics": "High contrast between hair, skin, and eyes; cool undertones; often grey/blue/slate eyes.",
        "undertone": "cool", "lightness": "medium", "chroma": "clear",
        "suggest": [
            {"name": "Icy Pink",      "hex_code": "#F4CFE4"},
            {"name": "Royal Blue",    "hex_code": "#3C60A8"},
            {"name": "Deep Violet",   "hex_code": "#524378"},
            {"name": "Berry",         "hex_code": "#C73C73"},
            {"name": "Cool Teal",     "hex_code": "#0D7388"},
            {"name": "Cobalt Blue",   "hex_code": "#2165B0"},
            {"name": "Rose Magenta",  "hex_code": "#D75C8F"},
            {"name": "Emerald",       "hex_code": "#018854"},
            {"name": "Hot Pink",      "hex_code": "#EA6EA6"},
            {"name": "Cool Purple",   "hex_code": "#7B4889"},
            {"name": "Vivid Red",     "hex_code": "#C12A2F"},
            {"name": "Bright Teal",   "hex_code": "#27A6BA"},
        ],
        "avoid": [
            {"name": "Warm Orange",   "hex_code": "#FF8300"},
            {"name": "Gold",          "hex_code": "#FFD700"},
            {"name": "Rust",          "hex_code": "#B7410E"},
            {"name": "Warm Beige",    "hex_code": "#D4B896"},
            {"name": "Caramel",       "hex_code": "#C68642"},
            {"name": "Warm Brown",    "hex_code": "#A05C34"},
            {"name": "Terracotta",    "hex_code": "#CB6D51"},
            {"name": "Olive",         "hex_code": "#808000"},
            {"name": "Warm Peach",    "hex_code": "#FFCBA4"},
            {"name": "Copper",        "hex_code": "#B87333"},
            {"name": "Warm Tan",      "hex_code": "#D2B48C"},
            {"name": "Mustard",       "hex_code": "#FFBC42"},
        ],
        "reason_suggest": "Icy cool hues and jewel tones bring out your cool, high-contrast natural coloring.",
        "reason_avoid":   "Warm-toned colors clash with your cool undertones and can make you look sallow.",
        "content": "Based on the image provided, you have a Cool Winter palette — cool, bold features that shine in vivid, icy, and jewel-toned hues.",
    },
    "Bright Winter": {
        "characteristics": "Clear, vivid coloring; can have red hair; bright eyes; the 'brightness' is determined by fabric drape reaction rather than obvious high contrast.",
        "undertone": "cool", "lightness": "medium", "chroma": "clear",
        "suggest": [
            {"name": "Electric Pink", "hex_code": "#E4414E"},
            {"name": "Vivid Green",   "hex_code": "#06984B"},
            {"name": "Cobalt Blue",   "hex_code": "#0257A5"},
            {"name": "Hot Magenta",   "hex_code": "#CE2F85"},
            {"name": "Emerald",       "hex_code": "#046E3A"},
            {"name": "Vivid Purple",  "hex_code": "#51428D"},
            {"name": "Icy Yellow",    "hex_code": "#FFE56A"},
            {"name": "Royal Blue",    "hex_code": "#353D8E"},
            {"name": "Coral Red",     "hex_code": "#E12540"},
            {"name": "Bright Teal",   "hex_code": "#029598"},
            {"name": "Icy White",     "hex_code": "#C0DFCE"},
            {"name": "Lime Green",    "hex_code": "#A7C545"},
        ],
        "avoid": [
            {"name": "Dusty Rose",    "hex_code": "#DCAE96"},
            {"name": "Muted Taupe",   "hex_code": "#8B8589"},
            {"name": "Warm Beige",    "hex_code": "#D4B896"},
            {"name": "Dusty Blue",    "hex_code": "#7F9AAF"},
            {"name": "Muted Sage",    "hex_code": "#9EA57E"},
            {"name": "Faded Coral",   "hex_code": "#E59079"},
            {"name": "Warm Brown",    "hex_code": "#A05C34"},
            {"name": "Dusty Mauve",   "hex_code": "#997A8D"},
            {"name": "Warm Tan",      "hex_code": "#D2B48C"},
            {"name": "Camel",         "hex_code": "#C19A6B"},
            {"name": "Pale Mustard",  "hex_code": "#E6CD7C"},
            {"name": "Greyed Green",  "hex_code": "#9BA89A"},
        ],
        "reason_suggest": "Clear, vivid colors allow your bright natural coloring to shine and create striking impact.",
        "reason_avoid":   "Muted or toned-down shades dull your vibrant, luminous features.",
        "content": "Based on the image provided, you have a Bright Winter palette — clear, vivid coloring that demands equally bright and bold hues.",
    },
}


# ──────────────────────────────────────────────────────────────────────────────
# Skin tone extraction
# ──────────────────────────────────────────────────────────────────────────────

def extract_skin_tone(img_bgr: np.ndarray) -> tuple[float, float, float]:
    """
    Extract dominant skin color using HSV skin masking + K-Means clustering.
    Returns mean BGR values of the dominant skin cluster.

    [FIX-2] Skin pixels are now randomly sampled before being fed to K-Means
            instead of taking the first N pixels, which were spatially biased
            toward the top-left corner of the mask (often forehead + hairline).
    [FIX-4] n_init raised to 10 and max_iter to 200 for stable convergence.
    """
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)

    mask1 = cv2.inRange(hsv, HSV_SKIN_LOWER1, HSV_SKIN_UPPER1)
    mask2 = cv2.inRange(hsv, HSV_SKIN_LOWER2, HSV_SKIN_UPPER2)
    mask  = cv2.bitwise_or(mask1, mask2)

    # Morphological cleanup
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask   = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  kernel)
    mask   = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    skin_pixels = img_bgr[mask > 0]

    if len(skin_pixels) < MIN_SKIN_PIXELS:
        # Fallback: use centre 20% of image
        h, w = img_bgr.shape[:2]
        y1, y2 = int(h * 0.3), int(h * 0.7)
        x1, x2 = int(w * 0.3), int(w * 0.7)
        skin_pixels = img_bgr[y1:y2, x1:x2].reshape(-1, 3)

    # [FIX-2] Random subsample to remove spatial bias
    if len(skin_pixels) > KMEANS_SAMPLE_SIZE:
        idx    = np.random.choice(len(skin_pixels), KMEANS_SAMPLE_SIZE, replace=False)
        sample = skin_pixels[idx]
    else:
        sample = skin_pixels

    # [FIX-4] n_init=10 and max_iter=200 for stable, reproducible centroids
    k  = min(3, len(sample))
    km = KMeans(n_clusters=k, n_init=10, random_state=42, max_iter=200)
    km.fit(sample)

    largest = np.argmax(np.bincount(km.labels_))
    return tuple(km.cluster_centers_[largest].astype(float))  # B, G, R


# ──────────────────────────────────────────────────────────────────────────────
# Skin tone → Season mapping logic
# ──────────────────────────────────────────────────────────────────────────────

def classify_skin(b: float, g: float, r: float) -> dict:
    """
    Classify the raw BGR skin tone into:
      - lightness  : "light" | "medium" | "dark"
      - undertone  : "warm"  | "cool"   | "neutral"
      - chroma     : "clear" | "soft"   ← [FIX-5] now properly computed

    [FIX-5] chroma is derived from per-channel saturation in BGR space.
            Previously the field was hardcoded to "clear" with a comment
            promising future refinement that never arrived.
    """
    brightness = 0.114 * b + 0.587 * g + 0.299 * r   # perceived luminance
    warmth     = r - b                                  # positive = warm, negative = cool

    # Normalised chroma: how far the dominant channel is from grey
    max_c      = max(r, g, b)
    min_c      = min(r, g, b)
    saturation = (max_c - min_c) / (max_c + 1e-5)      # 0.0 → grey, 1.0 → vivid

    lightness = (
        "light"  if brightness > BRIGHTNESS_LIGHT_THRESHOLD else
        "dark"   if brightness < BRIGHTNESS_DARK_THRESHOLD  else
        "medium"
    )
    undertone = (
        "warm"    if warmth > WARMTH_WARM_THRESHOLD  else
        "cool"    if warmth < WARMTH_COOL_THRESHOLD  else
        "neutral"
    )
    # [FIX-5] chroma is now derived from saturation, not hardcoded
    chroma = "clear" if saturation > SATURATION_CLEAR_THRESHOLD else "soft"

    return {
        "lightness":  lightness,
        "undertone":  undertone,
        "chroma":     chroma,
        "brightness": brightness,
        "warmth":     warmth,
        "saturation": saturation,
    }


def map_to_season(info: dict) -> str:
    """
    Decision tree mapping skin analysis → one of 12 seasons.

    [FIX-1] Three key corrections vs. v1:
      a) Soft Autumn is now reachable: warm-medium-soft skin routes here.
         Previously it was only reachable through the neutral branch.
      b) Bright Spring now sits in the warm-medium-clear path at high
         brightness, reflecting its actual identity as a high-contrast
         warm-leaning season. V1 placed it next to Warm Autumn with a
         single brightness split and no chroma gate.
      c) Bright Winter is now gated on low brightness (< 115) within the
         cool-medium-clear branch, correctly separating it from Cool Winter
         which skews lighter and more neutral.
    """
    lt  = info["lightness"]
    ut  = info["undertone"]
    ch  = info["chroma"]
    br  = info["brightness"]
    wm  = info["warmth"]

    # ── Warm undertone ────────────────────────────────────────────────────────
    if ut == "warm":
        if lt == "light":
            # Distinguish subtle Light Spring (lower warmth) from golden Warm Spring
            return "Warm Spring" if wm > 35 else "Light Spring"

        elif lt == "medium":
            if ch == "clear":
                # [FIX-1b] Bright Spring at higher brightness; Warm Autumn below
                return "Bright Spring" if br > 135 else "Warm Autumn"
            else:
                # [FIX-1a] Soft Autumn now correctly reachable
                return "Soft Autumn"

        else:  # dark
            return "Deep Autumn"

    # ── Cool undertone ────────────────────────────────────────────────────────
    elif ut == "cool":
        if lt == "light":
            # Soft Light Summer vs. slightly more defined Cool Summer
            return "Light Summer" if ch == "soft" else "Cool Summer"

        elif lt == "medium":
            if ch == "clear":
                # [FIX-1c] Bright Winter is lower brightness; Cool Winter is higher
                return "Bright Winter" if br < 115 else "Cool Winter"
            else:
                return "Cool Summer"

        else:  # dark
            return "Deep Winter"

    # ── Neutral undertone — split between Summer and Autumn families ──────────
    else:
        if lt == "light":
            return "Light Summer" if br > 165 else "Soft Summer"

        elif lt == "medium":
            # Slight warmth tips neutral-medium toward Soft Autumn
            return "Soft Autumn" if wm >= 0 else "Soft Summer"

        else:  # dark
            return "Deep Autumn" if wm >= 0 else "Deep Winter"


# ──────────────────────────────────────────────────────────────────────────────
# Image cropping helpers
# ──────────────────────────────────────────────────────────────────────────────

def detect_face(gray: np.ndarray):
    faces = FACE_CASCADE.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
    )
    if len(faces) == 0:
        return None
    return max(faces, key=lambda f: f[2] * f[3])


def crop_to_face(img: np.ndarray) -> np.ndarray:
    """
    Detect and crop to face region with padding, resize to OUTPUT_SIZE.

    [FIX-3] Fallback crop is now aspect-ratio aware:
      - Portrait images (h > w) → bias upward by ¼ to catch the face region.
      - Landscape images (w >= h) → centre crop, since the face could be
        anywhere horizontally and the vertical bias was actively harmful
        (cropping into background or chest instead of face).
    """
    h, w = img.shape[:2]
    gray  = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face  = detect_face(gray)

    if face is not None:
        fx, fy, fw, fh = face
        pad_x = int(fw * FACE_PADDING)
        pad_y = int(fh * FACE_PADDING)
        x1 = max(0, fx - pad_x);      y1 = max(0, fy - pad_y)
        x2 = min(w, fx + fw + pad_x); y2 = min(h, fy + fh + pad_y)

        side = max(x2 - x1, y2 - y1)
        cx   = (x1 + x2) // 2;  cy = (y1 + y2) // 2
        x1   = max(0, cx - side // 2); y1 = max(0, cy - side // 2)
        x2   = min(w, x1 + side);      y2 = min(h, y1 + side)
    else:
        side = min(w, h)
        x1   = (w - side) // 2

        # [FIX-3] Aspect-ratio-aware vertical offset for the fallback crop
        if h > w:
            # Portrait: face is likely in the upper portion → bias upward
            y1 = (h - side) // 4
        else:
            # Landscape: no reliable assumption → centre vertically
            y1 = (h - side) // 2

        x2 = x1 + side
        y2 = y1 + side

    cropped = img[y1:y2, x1:x2]
    return cv2.resize(cropped, (OUTPUT_SIZE, OUTPUT_SIZE), interpolation=cv2.INTER_LANCZOS4)


def encode_to_base64_jpeg(img_bgr: np.ndarray) -> str:
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    pil     = Image.fromarray(img_rgb)
    buf     = io.BytesIO()
    pil.save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


def decode_base64_image(b64: str) -> np.ndarray:
    data   = base64.b64decode(b64)
    np_arr = np.frombuffer(data, np.uint8)
    img    = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode base64 image")
    return img


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "rizz-up-face-detection", "version": "2.1.0"}


@app.post("/api/images/crop")
async def crop_image(image: UploadFile = File(...)):
    """Accept a multipart image, detect face, crop & resize → base64 JPEG."""
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "Uploaded file is not an image.")
    try:
        data   = await image.read()
        np_arr = np.frombuffer(data, np.uint8)
        img    = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise HTTPException(400, "Could not decode image.")
        cropped = crop_to_face(img)
        return {"cropped_image": encode_to_base64_jpeg(cropped)}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] crop: {e}", file=sys.stderr)
        raise HTTPException(500, f"Image processing failed: {e}")


class AnalyzeRequest(BaseModel):
    base64Image: str


@app.post("/api/images/analyze")
async def analyze_image(body: AnalyzeRequest):
    """
    Accept a base64 JPEG, run skin-tone analysis, return season + color palette
    in the exact JSON format expected by the /analysis SvelteKit page.

    [FIX-6] Added early size validation so a malformed/truncated payload gets
            a clean HTTP 400 rather than a cryptic cv2 decode crash.
    """
    # [FIX-6] Guard against obviously malformed payloads before decoding
    if len(body.base64Image) < 1000:
        raise HTTPException(
            400,
            "base64Image payload is too small — the image may be malformed or truncated."
        )

    try:
        img         = decode_base64_image(body.base64Image)
        b, g, r     = extract_skin_tone(img)
        info        = classify_skin(b, g, r)
        season      = map_to_season(info)
        data        = SEASONS_DB[season]

        return {
            "season":           season,
            "characteristics":  data["characteristics"],
            "colorsToSuggest":  data["suggest"],
            "reasonToSuggest":  data["reason_suggest"],
            "colorsToAvoid":    data["avoid"],
            "reasonToAvoid":    data["reason_avoid"],
            "content":          data["content"],
            # Debug info — remove in production if preferred
            "_debug": {
                "brightness": round(info["brightness"], 2),
                "warmth":     round(info["warmth"], 2),
                "saturation": round(info["saturation"], 4),
                "lightness":  info["lightness"],
                "undertone":  info["undertone"],
                "chroma":     info["chroma"],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] analyze: {e}", file=sys.stderr)
        raise HTTPException(500, f"Analysis failed: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  Rizz-Up Face Detection & Skin Analysis Service v2.1.0")
    print("  http://localhost:8000")
    print("=" * 60)
    print("  Endpoints:")
    print("    GET  /health             -- liveness check")
    print("    POST /api/images/crop    -- face crop -> base64 JPEG")
    print("    POST /api/images/analyze -- skin tone -> color season")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)