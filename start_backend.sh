#!/bin/bash
echo "=========================================="
echo "   Rizz-Up Virtual Try-On Backend"
echo "=========================================="
echo ""
echo "[1/3] Activating virtual environment..."
# Get the directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

if [ ! -d ".venv" ]; then
    echo "Error: .venv directory not found in root."
    read -p "Press enter to exit..."
    exit 1
fi

source .venv/Scripts/activate

echo "[2/3] Navigating to backend directory..."
cd virtual-tryon/backend

echo "[3/3] Starting FastAPI server..."
echo ""
python main.py

if [ $? -ne 0 ]; then
    echo ""
    echo "Backend failed to start."
    read -p "Press enter to exit..."
fi
