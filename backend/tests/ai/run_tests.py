#!/usr/bin/env python3
"""Execute the BaseAIAgent tests directly"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

# Import and run the test
try:
    from test_base_agent_simplified import run_comprehensive_tests
    print("Starting comprehensive AI agent tests...")
    success = run_comprehensive_tests()
    print(f"Tests completed. Success: {success}")
except Exception as e:
    print(f"Error running tests: {e}")
    import traceback
    traceback.print_exc()
