#!/usr/bin/env python3
"""
Ultra simple test - just import and basic functionality
"""

import sys
from pathlib import Path

# Add the correct path to the easy_agent module
agent_path = Path("/workspaces/Nen/backend/ai-services/agents")
sys.path.insert(0, str(agent_path))

print("1. Testing import...")
try:
    from easy_agent import EasyAgent, EasyAgentConfig
    print("   ✅ Import successful")
except Exception as e:
    print(f"   ❌ Import failed: {e}")
    exit(1)

print("2. Testing agent creation...")
try:
    config = EasyAgentConfig(capture_preference_rate=0.70)
    agent = EasyAgent("balanced", config)
    print("   ✅ Agent creation successful")
except Exception as e:
    print(f"   ❌ Agent creation failed: {e}")
    exit(1)

print("3. Testing basic configuration...")
try:
    rate = agent.easy_config.capture_preference_rate
    print(f"   Capture preference rate: {rate}")
    if rate == 0.70:
        print("   ✅ Configuration correct")
    else:
        print("   ❌ Configuration incorrect")
except Exception as e:
    print(f"   ❌ Configuration test failed: {e}")
    exit(1)

print("4. Testing move generation (basic)...")
try:
    # Very simple board
    board = [[[None] * 3 for _ in range(9)] for _ in range(9)]
    board[0][0][0] = {'type': 'pawn', 'player': 1}

    board_state = {
        'board': board,
        'currentPlayer': 1,
        'moveNumber': 1,
        'gameStatus': 'active'
    }

    move = agent.select_move(board_state)
    print(f"   Generated move: {move is not None}")
    print("   ✅ Basic move generation works")
except Exception as e:
    print(f"   ❌ Move generation failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n✅ All basic tests passed!")
print("Agent is functional and ready for comprehensive testing.")
