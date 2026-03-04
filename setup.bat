@echo off
REM FC Barcelona Dashboard - Automatic Setup Script
REM Run this file to install dependencies and start the server

setlocal
cd /d %~dp0

echo ================================
echo FC Barcelona Dashboard - Setup
echo ================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from python.org
    pause
    exit /b 1
)

echo [1/3] Creating virtual environment...
python -m venv venv

echo [2/3] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/3] Installing dependencies...
pip install -r backend\requirements.txt

echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo Starting Flask server...
echo Navigate to http://localhost:5000 in your browser
echo.
echo Press Ctrl+C to stop the server
echo.

python backend\app.py

pause
