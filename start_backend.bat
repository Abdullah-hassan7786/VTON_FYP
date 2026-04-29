@echo off
echo ==========================================
echo    Rizz-Up Virtual Try-On Backend
echo ==========================================
echo.
echo [1/3] Activating virtual environment...
cd /d "%~dp0"
if not exist ".venv" (
    echo Error: .venv directory not found in root.
    pause
    exit /b
)
call .venv\Scripts\activate

echo [2/3] Navigating to backend directory...
cd virtual-tryon\backend

echo [3/3] Starting FastAPI server...
echo.
python main.py

if %ERRORLEVEL% neq 0 (
    echo.
    echo Backend failed to start.
    pause
)
