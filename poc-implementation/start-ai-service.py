#!/usr/bin/env python3
"""
AI Service Starter
Starts the AI service using Python Flask
"""

import subprocess
import sys
import os
from pathlib import Path

def start_ai_service():
    print("🚀 Starting AI Service...")
    
    # Change to AI directory
    ai_dir = Path(__file__).parent / 'ai'
    os.chdir(ai_dir)
    
    # Use the configured Python executable
    python_cmd = r"A:/Nen Platform/Nen/.venv/Scripts/python.exe"
    
    try:
        # Start the AI service
        process = subprocess.Popen(
            [python_cmd, 'app.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        print(f"✅ AI Service started with PID: {process.pid}")
        print("📍 AI Service URL: http://127.0.0.1:3003")
        print("🔍 Health Check: http://127.0.0.1:3003/health")
        
        # Wait for the process and stream output
        for line in iter(process.stdout.readline, ''):
            print(line.rstrip())
            
    except FileNotFoundError:
        print(f"❌ Python executable not found: {python_cmd}")
        print("Please ensure Python virtual environment is properly configured")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Failed to start AI service: {e}")
        sys.exit(1)

if __name__ == '__main__':
    start_ai_service()
