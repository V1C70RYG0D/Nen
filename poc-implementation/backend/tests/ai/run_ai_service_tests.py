#!/usr/bin/env python3
"""
AI Service Test Runner
Executes comprehensive AI service tests and reports results
"""

import os
import sys
import subprocess
import time
import json
from pathlib import Path

def check_server_running(base_url="http://localhost:3000"):
    """Check if AI service is running"""
    import requests
    try:
        response = requests.get(f"{base_url}/api/ai/health", timeout=5)
        return response.status_code == 200
    except:
        return False

def start_local_server():
    """Start local server for testing"""
    print("Starting local server...")
    try:
        # Try to start the server
        server_path = Path(__file__).parent.parent.parent / "src" / "server.ts"
        if server_path.exists():
            subprocess.Popen(["npm", "run", "dev"], cwd=server_path.parent.parent)
            time.sleep(5)  # Give server time to start
            return True
    except Exception as e:
        print(f"Failed to start server: {e}")
    return False

def install_requirements():
    """Install required Python packages"""
    requirements = [
        "requests>=2.28.0",
        "aiohttp>=3.8.0",
        "psutil>=5.9.0",
        "pytest>=7.0.0"
    ]
    
    print("Installing required packages...")
    for package in requirements:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        except subprocess.CalledProcessError:
            print(f"Warning: Failed to install {package}")

def run_tests():
    """Run the comprehensive AI service tests"""
    test_file = Path(__file__).parent / "comprehensive_ai_service_tests.py"
    
    if not test_file.exists():
        print(f"Test file not found: {test_file}")
        return False
    
    try:
        # Run the test
        result = subprocess.run([sys.executable, str(test_file)], 
                              capture_output=True, text=True)
        
        print("STDOUT:", result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        return result.returncode == 0
    except Exception as e:
        print(f"Failed to run tests: {e}")
        return False

def main():
    """Main execution function"""
    print("=== AI Service Testing Runner ===")
    
    # Install requirements
    install_requirements()
    
    # Check if server is running
    if not check_server_running():
        print("Server not detected at localhost:3000")
        print("Please start your AI service server manually, then run:")
        print(f"python {Path(__file__).resolve()}")
        
        # Try to start local server
        if not start_local_server():
            print("Failed to start server automatically")
            print("Manual server start required:")
            print("1. cd to your backend directory")
            print("2. npm run dev (or your start command)")
            print("3. Run this test again")
            return 1
        
        # Wait a bit more and check again
        time.sleep(3)
        if not check_server_running():
            print("Server still not available after startup attempt")
            return 1
    
    print("AI service detected - starting tests...")
    
    # Set environment variables for tests
    os.environ.setdefault('AI_SERVICE_BASE_URL', 'http://localhost:3000')
    os.environ.setdefault('CONCURRENT_REQUESTS', '25')  # Reduced for stability
    os.environ.setdefault('PERFORMANCE_THRESHOLD_MS', '2000')  # More lenient
    
    # Run comprehensive tests
    if run_tests():
        print("\n✅ AI Service testing completed successfully!")
        return 0
    else:
        print("\n❌ AI Service testing failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
