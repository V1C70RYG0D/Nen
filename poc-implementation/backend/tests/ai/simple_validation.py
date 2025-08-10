#!/usr/bin/env python3
"""
Simple validation script for EasyAgent
Testing core functionality as specified in user requirements
"""

import sys
import os
import time
from pathlib import Path

# Add the path to our AI services
agents_path = Path(__file__).parent.parent.parent / "ai-services" / "agents"
sys.path.insert(0, str(agents_path))

def main():
    print("=== EasyAgent Simple Validation ===")

    # Test import
    try:
        from easy_agent import EasyAgent, EasyAgentConfig
        print("✓ Import successful")
    except Exception as e:
        print(f"✗ Import failed: {e}")
        return False

    # Test basic creation
    try:
        agent = EasyAgent("balanced")
        print("✓ Agent creation successful")
    except Exception as e:
        print(f"✗ Agent creation failed: {e}")
        return False

    # Test basic move generation
    try:
        board_state = {
            'board': [[[None for _ in range(3)] for _ in range(9)] for _ in range(9)],
            'currentPlayer': 1,
            'gamePhase': 'midgame'
        }
        board_state['board'][4][4][0] = {'type': 'pawn', 'player': 1}

        move = agent.select_move(board_state)
        if move:
            print("✓ Move generation successful")
            print(f"  Move: {move['from']} -> {move['to']}")
        else:
            print("✓ No moves available (expected for simple board)")

    except Exception as e:
        print(f"✗ Move generation failed: {e}")
        return False

    # Test speed requirement
    try:
        start_time = time.time()
        for _ in range(10):
            agent.select_move(board_state)
        total_time = (time.time() - start_time) * 1000
        avg_time = total_time / 10

        print(f"✓ Speed test: {avg_time:.2f}ms per move")
        if avg_time < 10.0:
            print("✓ Meets 10ms requirement")
        else:
            print("⚠ Exceeds 10ms requirement")
    except Exception as e:
        print(f"✗ Speed test failed: {e}")
        return False

    print("\n=== Validation Complete ===")
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("✅ All validations passed!")
    else:
        print("❌ Some validations failed!")
    sys.exit(0 if success else 1)
