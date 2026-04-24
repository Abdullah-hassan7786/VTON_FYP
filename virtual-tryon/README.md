# Rizz-Up Virtual Try-On & Skin Tone Analysis Platform

## Project Overview
Rizz-Up is an AI-powered fashion platform designed to recommend clothing colors based on a user's skin tone and allow them to virtually try on clothing items. The system leverages a FastAPI Python backend for image processing and AI analysis, integrated with a React frontend for a seamless, interactive user experience.

## Features
- **Secure Authentication:** User registration and login powered by Supabase.
- **AI Skin Tone Analysis:** Automatically detects faces, extracts dominant skin tones, and classifies the user into a "Color Season" (e.g., Soft Autumn, Deep Winter).
- **Color Recommendations:** Suggests ideal clothing colors and warns against colors that clash with the user's complexion.
- **Virtual Try-On (In Progress):** Simulates how specific clothing items will look on the user.
- **Admin Dashboard:** Allows administrators to track user growth, view analytics, and manage the clothing catalog.

---

## Folder Structure

```text
virtual-tryon/
├── backend/                  # FastAPI Python backend for AI and Image Processing
│   ├── main.py               # Empty placeholder file
│   ├── face_detection.py     # Core FastAPI application containing all AI routes
│   └── requirements.txt      # Python dependencies (FastAPI, OpenCV, scikit-learn, etc.)
│
├── frontend/                 # React frontend built with Vite & TailwindCSS
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # Reusable UI components (Buttons, Cards, Loaders)
│   │   ├── context/          # React Context providers (AuthContext handles Supabase Auth)
│   │   ├── data/             # Mock data (mockClothingData.js)
│   │   ├── lib/              # Integrations (supabase.js client configuration)
│   │   ├── pages/            # Application views (Dashboard, Admin, TryOn, Analysis)
│   │   ├── App.jsx           # Main React routing setup
│   │   └── main.jsx          # React entry point
│   ├── .env                  # Environment variables (API URLs, Supabase keys)
│   ├── package.json          # Node.js dependencies
│   ├── tailwind.config.js    # TailwindCSS styling rules
│   └── vite.config.js        # Vite bundler configuration
└── README.md                 # This documentation file
```

---

## AI Routes Documentation

The backend service runs on `http://localhost:8000` via FastAPI (`face_detection.py`).

### 1. `POST /api/images/crop`
- **Purpose:** Extracts the user's face from a larger image. It uses OpenCV Haar Cascades to find a face, crops it with padding, and resizes it to 512x512 pixels.
- **Input Format:** `multipart/form-data` with a file field named `image`.
- **Output Format:** JSON containing a base64 encoded JPEG.
  ```json
  { "cropped_image": "/9j/4AAQSkZJ...<base64_string>" }
  ```
- **Integration:** Used by the frontend during the initial image upload stage to preview the user's face before running full analysis.

### 2. `POST /api/images/analyze`
- **Purpose:** Analyzes the skin tone and determines the user's "Seasonal Color Palette". It uses K-Means clustering to find the dominant skin tone and maps it to 1 of 12 seasons.
- **Input Format:** JSON body with a base64 encoded image string.
  ```json
  { "base64Image": "/9j/4AAQSkZJ...<base64_string>" }
  ```
- **Output Format:** JSON containing the user's season and recommended/avoided color palettes.
  ```json
  {
    "season": "Soft Autumn",
    "characteristics": "Little contrast between hair and skin...",
    "colorsToSuggest": [{ "name": "Warm Sage", "hex_code": "#93926A" }],
    "reasonToSuggest": "Muted warm tones with earthy depth...",
    "colorsToAvoid": [{ "name": "Black", "hex_code": "#1A1A1A" }],
    "reasonToAvoid": "Stark colours make you appear sallow.",
    "content": "Based on the image provided..."
  }
  ```
- **Integration:** Called by the frontend `AnalysisPage.jsx` to render the user's results.

---

## Supabase Integration

The project has recently migrated from Firebase to Supabase for Authentication and Database management.

### Setup Steps
1. **Create Project:** Set up a new project in your Supabase Organization.
2. **Environment Variables:** Update `frontend/.env` with your Supabase credentials.
3. **Run SQL Migrations:** Execute the following in the Supabase SQL Editor to create the necessary tables:
   ```sql
   create table public.users ( id uuid references auth.users not null primary key, email text, full_name text, role text default 'user', created_at timestamp with time zone default timezone('utc'::text, now()) not null );
   create table public.catalog ( id uuid default uuid_generate_v4() primary key, title text not null, category text not null, image_url text not null, created_at timestamp with time zone default timezone('utc'::text, now()) not null );
   create table public.tryon_history ( id uuid default uuid_generate_v4() primary key, user_id uuid references public.users(id) not null, user_image_url text not null, clothing_id uuid references public.catalog(id) not null, result_image_url text not null, created_at timestamp with time zone default timezone('utc'::text, now()) not null );
   ```

### Verification
- **Authentication:** Handled in `frontend/src/context/AuthContext.jsx`. The migration to `supabase.auth` is complete.
- **Admin Panel:** Handled in `frontend/src/pages/Admin.jsx`. The user table query now fetches directly from Supabase via `supabase.from('users').select('*')`.

---

## Setup and Installation

### 1. Start the Backend
```bash
cd backend
pip install -r requirements.txt
python face_detection.py
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Development Progress Log

### Completed Tasks
- [x] Set up Vite + React frontend structure.
- [x] Set up FastAPI backend.
- [x] Implement OpenCV face detection route.
- [x] Implement K-Means skin tone analysis route.
- [x] Replace Firebase with Supabase for Authentication.
- [x] Rewrite `AuthContext.jsx` to use Supabase Auth.
- [x] Rewrite `Admin.jsx` to fetch stats from Supabase Postgres.

### Pending Tasks & Known Issues
- [ ] **Major Bug:** Legacy Firebase imports in `Dashboard.jsx`, `TryOn.jsx`, `ProfilePage.jsx`, `HistoryPage.jsx`, and `AnalysisPage.jsx` need to be migrated to Supabase.
- [ ] Implement Row Level Security (RLS) in Supabase.
- [ ] Connect the Catalog page to Supabase instead of `mockClothingData.js`.
- [ ] Implement the actual Virtual Try-On image blending logic in the backend.
