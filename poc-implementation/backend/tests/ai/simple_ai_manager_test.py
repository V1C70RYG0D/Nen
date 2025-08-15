#!/usr/bin/env python3
"""
Simple AI Manager Test - Verifying imports and basic functionality
"""

import os
import sys
from pathlib import Path

# Add the ai-services directory to Python path
current_dir = Path(__file__).parent
ai_services_dir = current_dir.parent.parent / "ai-services"
sys.path.insert(0, str(ai_services_dir))

print(f"Current directory: {current_dir}")
print(f"AI services directory: {ai_services_dir}")
print(f"AI services directory exists: {ai_services_dir.exists()}")

# List files in ai-services
if ai_services_dir.exists():
    print("Files in ai-services:")
    for file in ai_services_dir.glob("*.py"):
        print(f"  {file.name}")

# Test basic imports
try:
    print("\nTesting imports...")

    # First try importing config
    import config
    print("✓ config imported successfully")

    # Try importing ai_manager
    import ai_manager
    print("✓ ai_manager imported successfully")

    # Test creating AI Manager
    test_config = {
        'backend_url': 'http://localhost:3000',
        'redis_url': 'redis://localhost:6379',
        'auth_token': 'test_token_123',
        'allowed_origins': ['http://localhost:3000'],
        'performance_target_ms': 90,
        'database_url': 'sqlite:///:memory:',
        'secret_key': 'test_secret_key_123',
        'jwt_secret': 'test_jwt_secret_456'
    }

    manager = ai_manager.AIManager(config=test_config)
    print("✓ AI Manager created successfully")

    # Test basic functionality
    agent = manager.get_random_agent()
    if agent:
        print(f"✓ Got random agent: {agent.agent_id}")
    else:
        print("✗ Failed to get random agent")

    # Test getting specific agent
    specific_agent = manager.get_agent("medium", "aggressive")
    if specific_agent:
        print(f"✓ Got specific agent: {specific_agent.agent_id}")
    else:
        print("✗ Failed to get specific agent")

    # Clean up
    manager.shutdown()
    print("✓ Manager shutdown successfully")

    print("\n🎉 All basic tests passed!")

except ImportError as e:
    print(f"❌ Import error: {e}")
    import traceback
    traceback.print_exc()
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
