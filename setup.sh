#!/bin/bash

# FC Barcelona Dashboard - Automatic Setup Script
# Run this file to install dependencies and start the server

set -e
cd "$(dirname "$0")"

echo "================================"
echo "FC Barcelona Dashboard - Setup"
echo "================================"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from python.org"
    exit 1
fi

echo "[1/3] Creating virtual environment..."
python3 -m venv venv

echo "[2/3] Activating virtual environment..."
source venv/bin/activate

echo "[3/3] Installing dependencies..."
pip install -r backend/requirements.txt

echo
echo "================================"
echo "Setup Complete!"
echo "================================"
echo
echo "Starting Flask server..."
echo "Navigate to http://localhost:5000 in your browser"
echo
echo "Press Ctrl+C to stop the server"
echo

python backend/app.py
